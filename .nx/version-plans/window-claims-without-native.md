---
__default__: patch
---

Where a native module is not there, as on the web or in a test, each app keeps its own window claims. An app injecting two of `Brightness`, `KeepAwake` and `ScreenCapture` without their modules no longer gets one service's state in another and throws, and `StatusBar`, `NavigationBar` and `DeviceOrientation` claims no longer carry over from one app to the next without React Native.
