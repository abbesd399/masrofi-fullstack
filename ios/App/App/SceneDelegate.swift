import UIKit
import WebKit
import AVFoundation
import UserNotifications
import Capacitor

class MasrofiViewController: CAPBridgeViewController, WKScriptMessageHandler {

    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "masrofiNotify")
        config.userContentController.add(self, name: "masrofiScheduleBg")
        return config
    }

    override open func viewDidLoad() {
        super.viewDidLoad()

        // Lock native WKWebView zoom and bounce so it behaves 100% like a native iOS app
        if let wv = self.webView {
            wv.scrollView.bounces = false
            wv.scrollView.alwaysBounceVertical = false
            wv.scrollView.alwaysBounceHorizontal = false
            wv.scrollView.minimumZoomScale = 1.0
            wv.scrollView.maximumZoomScale = 1.0
            wv.scrollView.bouncesZoom = false
            wv.allowsBackForwardNavigationGestures = false
        }

        // Request native iOS Notification & Camera permissions on entry
        requestNativePermissionsOnEntry()
    }

    private func requestNativePermissionsOnEntry() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in
            DispatchQueue.main.async {
                AVCaptureDevice.requestAccess(for: .video) { _ in }
            }
        }
    }

    // Native iOS Notification Bridge — delivers notifications even when the user is OUTSIDE the app or on the Lock Screen
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any] else { return }

        if message.name == "masrofiNotify" {
            let title = (dict["title"] as? String) ?? "مصروفي · Masrofi"
            let body = (dict["body"] as? String) ?? ""
            let delaySec = max(0.5, (dict["delaySec"] as? Double) ?? 0.5)

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delaySec, repeats: false)
            let req = UNNotificationRequest(identifier: "masrofi_now_\(UUID().uuidString)", content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
        } else if message.name == "masrofiScheduleBg" {
            let title = (dict["monthlyTitle"] as? String) ?? "تنبيه الذكاء الاصطناعي لهذا الشهر"
            let body = (dict["monthlyBody"] as? String) ?? ""
            guard !body.isEmpty else { return }

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default

            // Schedule recurring monthly/daily check reminder when outside the app
            var dateComponents = DateComponents()
            dateComponents.hour = 10
            dateComponents.minute = 0
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            let req = UNNotificationRequest(identifier: "masrofi_monthly_ai_check", content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
        }
    }

    @available(iOS 15.0, *)
    public func webView(_ webView: WKWebView,
                        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                        initiatedByFrame frame: WKFrameInfo,
                        type: WKMediaCaptureType,
                        decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MasrofiViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
