package dev.ngnative.expo

import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import java.util.WeakHashMap

/**
 * The keyboard as one window sees it, frame by frame: the inset the keyboard takes from the bottom
 * of the window, in pixels, as Android animates it.
 *
 * Android tells a view about the keyboard's motion through `WindowInsetsAnimationCompat`, but only
 * a view the window dispatches to: react-native-screens stops the dispatch at a sheet's screen, to
 * move the sheet itself. So the callback is on a view of its own, appended to the window's content
 * after the app, which the dispatch reaches past every screen. A window of its own, as a modal is,
 * has a watcher of its own.
 *
 * Nothing here applies or consumes an inset: the app lays itself out as it did without it.
 */
internal class KeyboardWatcher private constructor(private val root: ViewGroup) {
  interface Listener {
    /** The keyboard starts to move to `target`, over `duration` milliseconds. */
    fun onKeyboardStart(target: Int, duration: Long)
    /** One frame of the motion. */
    fun onKeyboardProgress(inset: Int)
    /** The keyboard has stopped at `inset`. */
    fun onKeyboardEnd(inset: Int)
  }

  private val listeners = LinkedHashSet<Listener>()
  private val probe = View(root.context)

  /** Where the keyboard is now, as the last frame left it. */
  var inset = keyboardInset(ViewCompat.getRootWindowInsets(root))
    private set

  /** Set from the moment Android prepares a motion, which comes before the insets it ends at. */
  var moving = false
    private set

  /** The window's bottom edge on the screen, which the keyboard's top is measured up from. */
  val bottomOnScreen: Int
    get() {
      val window = root.rootView
      val location = IntArray(2)
      window.getLocationOnScreen(location)
      return location[1] + window.height
    }

  init {
    root.addView(probe, ViewGroup.LayoutParams(0, 0))
    ViewCompat.setWindowInsetsAnimationCallback(
      probe,
      object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
        override fun onPrepare(animation: WindowInsetsAnimationCompat) {
          if (animation.isKeyboard) moving = true
        }

        override fun onStart(
          animation: WindowInsetsAnimationCompat,
          bounds: WindowInsetsAnimationCompat.BoundsCompat,
        ): WindowInsetsAnimationCompat.BoundsCompat {
          if (animation.isKeyboard) {
            // The window's insets are the ones the motion ends at by now.
            val target = keyboardInset(ViewCompat.getRootWindowInsets(probe))
            listeners.toList().forEach { it.onKeyboardStart(target, animation.durationMillis) }
          }
          return bounds
        }

        override fun onProgress(
          insets: WindowInsetsCompat,
          running: MutableList<WindowInsetsAnimationCompat>,
        ): WindowInsetsCompat {
          if (running.any { it.isKeyboard }) {
            inset = keyboardInset(insets)
            listeners.toList().forEach { it.onKeyboardProgress(inset) }
          }
          return insets
        }

        override fun onEnd(animation: WindowInsetsAnimationCompat) {
          if (!animation.isKeyboard) return
          moving = false
          inset = keyboardInset(ViewCompat.getRootWindowInsets(probe))
          listeners.toList().forEach { it.onKeyboardEnd(inset) }
        }
      },
    )
    // A keyboard that changes without a motion: with animations turned off, or a height that
    // changes in place. Below Android 11 the compat callback animates every change itself, and
    // owns the view's insets listener to do it.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      ViewCompat.setOnApplyWindowInsetsListener(probe) { _, insets ->
        val now = keyboardInset(insets)
        if (!moving && now != inset) {
          inset = now
          listeners.toList().forEach {
            it.onKeyboardStart(now, 0)
            it.onKeyboardEnd(now)
          }
        }
        insets
      }
    }
  }

  private fun add(listener: Listener) {
    listeners.add(listener)
  }

  private fun remove(listener: Listener) {
    listeners.remove(listener)
    if (listeners.isNotEmpty()) return
    ViewCompat.setWindowInsetsAnimationCallback(probe, null)
    ViewCompat.setOnApplyWindowInsetsListener(probe, null)
    root.removeView(probe)
    watchers.remove(root)
  }

  companion object {
    private val watchers = WeakHashMap<ViewGroup, KeyboardWatcher>()

    /** The window content `view` is in, which its watcher's view joins. */
    private fun rootOf(view: View): ViewGroup? =
      view.rootView.findViewById(android.R.id.content) ?: view.rootView as? ViewGroup

    /**
     * Start telling `listener` about the keyboard of the window `view` is in. Answers the watcher,
     * or null when the view is in no window. On the main thread.
     */
    fun watch(view: View, listener: Listener): KeyboardWatcher? {
      val root = rootOf(view) ?: return null
      return watchers.getOrPut(root) { KeyboardWatcher(root) }.also { it.add(listener) }
    }

    /** Stop telling `listener`, and take the watcher's view away with the last one. */
    fun unwatch(watcher: KeyboardWatcher?, listener: Listener) {
      watcher?.remove(listener)
    }

    private val WindowInsetsAnimationCompat.isKeyboard: Boolean
      get() = typeMask and WindowInsetsCompat.Type.ime() != 0

    private fun keyboardInset(insets: WindowInsetsCompat?): Int =
      insets?.getInsets(WindowInsetsCompat.Type.ime())?.bottom ?: 0
  }
}
