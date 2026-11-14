import UIKit
import WebKit
import AVFoundation
import UserNotifications
import Capacitor

class MasrofiViewController: CAPBridgeViewController {

    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
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
