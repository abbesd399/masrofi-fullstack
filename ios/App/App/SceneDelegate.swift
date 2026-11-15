import UIKit
import WebKit
import AVFoundation
import UserNotifications
import Vision
import Capacitor

class MasrofiViewController: CAPBridgeViewController, WKScriptMessageHandler {

    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "masrofiNotify")
        config.userContentController.add(self, name: "masrofiScheduleBg")
        config.userContentController.add(self, name: "masrofiRecognizeText")
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
        } else if message.name == "masrofiRecognizeText" {
            guard let base64Str = dict["base64"] as? String,
                  let callbackId = dict["callbackId"] as? String else { return }

            let cleanBase64 = base64Str.replacingOccurrences(of: "data:image/jpeg;base64,", with: "")
                                       .replacingOccurrences(of: "data:image/png;base64,", with: "")
            guard let imageData = Data(base64Encoded: cleanBase64),
                  let uiImage = UIImage(data: imageData),
                  let cgImage = uiImage.cgImage else {
                return
            }

            let request = VNRecognizeTextRequest { (req, err) in
                guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
                var recognizedStrings: [String] = []
                for obs in observations {
                    if let candidate = obs.topCandidates(1).first {
                        recognizedStrings.append(candidate.string)
                    }
                }
                let fullText = recognizedStrings.joined(separator: "\n")
                DispatchQueue.main.async {
                    let jsonData = (try? JSONSerialization.data(withJSONObject: recognizedStrings)) ?? Data()
                    let jsonArr = String(data: jsonData, encoding: .utf8) ?? "[]"
                    let js = "window.M && window.M.onNativeVisionResult && window.M.onNativeVisionResult('\(callbackId)', { fullText: \(fullText.debugDescription), lines: \(jsonArr) });"
                    self.webView?.evaluateJavaScript(js, completionHandler: nil)
                }
            }
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["ar-SA", "fr-FR", "en-US"]
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            DispatchQueue.global(qos: .userInitiated).async {
                try? handler.perform([request])
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
