import UIKit
import WebKit
import AVFoundation
import Vision
import UserNotifications
import Capacitor

class MasrofiViewController: CAPBridgeViewController, WKScriptMessageHandler {

    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "masrofiNotify")
        config.userContentController.add(self, name: "masrofiScheduleBg")
        config.userContentController.add(self, name: "masrofiOCR")
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

    // Native iOS Notification + Apple Vision OCR Bridge
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

            let payday = max(1, min(28, (dict["payday"] as? Int) ?? 1))
            var dateComponents = DateComponents()
            dateComponents.day = payday
            dateComponents.hour = 9
            dateComponents.minute = 0
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            let req = UNNotificationRequest(identifier: "masrofi_monthly_ai_check", content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
        } else if message.name == "masrofiOCR" {
            let reqId = (dict["reqId"] as? String) ?? ""
            let dataUrl = (dict["image"] as? String) ?? ""
            guard !reqId.isEmpty, !dataUrl.isEmpty else { return }
            performNativeVisionOCR(reqId: reqId, dataUrl: dataUrl)
        }
    }

    private func performNativeVisionOCR(reqId: String, dataUrl: String) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let base64Part: String
            if let commaRange = dataUrl.range(of: ",") {
                base64Part = String(dataUrl[commaRange.upperBound...])
            } else {
                base64Part = dataUrl
            }
            guard let imgData = Data(base64Encoded: base64Part, options: .ignoreUnknownCharacters),
                  let uiImage = UIImage(data: imgData),
                  let cgImage = uiImage.cgImage else {
                self?.sendOCRResult(reqId: reqId, text: "")
                return
            }

            let request = VNRecognizeTextRequest { [weak self] req, _ in
                let observations = (req.results as? [VNRecognizedTextObservation]) ?? []
                struct BoxItem {
                    let text: String
                    let midY: CGFloat
                    let minX: CGFloat
                }
                var items: [BoxItem] = []
                for obs in observations {
                    if let cand = obs.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines), !cand.isEmpty {
                        let bb = obs.boundingBox
                        items.append(BoxItem(text: cand, midY: bb.midY, minX: bb.minX))
                    }
                }
                // Sort top-to-bottom (in Vision coordinates, y=1 is top and y=0 is bottom)
                items.sort { $0.midY > $1.midY }

                // Group items on the same horizontal line (within 2.6% vertical tolerance) and sort left-to-right
                var rows: [[BoxItem]] = []
                for item in items {
                    if var lastRow = rows.last, let firstInRow = lastRow.first, abs(firstInRow.midY - item.midY) < 0.026 {
                        lastRow.append(item)
                        rows[rows.count - 1] = lastRow
                    } else {
                        rows.append([item])
                    }
                }
                let lines: [String] = rows.map { row in
                    let sortedRow = row.sorted { $0.minX < $1.minX }
                    return sortedRow.map { $0.text }.joined(separator: "   ")
                }
                let fullText = lines.joined(separator: "\n")
                self?.sendOCRResult(reqId: reqId, text: fullText)
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            if #available(iOS 16.0, *) {
                request.automaticallyDetectsLanguage = true
            }
            request.recognitionLanguages = ["fr-FR", "ar-SA", "en-US"]

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                self?.sendOCRResult(reqId: reqId, text: "")
            }
        }
    }

    private func sendOCRResult(reqId: String, text: String) {
        DispatchQueue.main.async { [weak self] in
            guard let wv = self?.webView else { return }
            let encodedReq = (try? JSONSerialization.data(withJSONObject: [reqId]))
                .flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
            let encodedTxt = (try? JSONSerialization.data(withJSONObject: [text]))
                .flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
            let js = "if(window.__masrofiOCRCallback){window.__masrofiOCRCallback((\(encodedReq))[0],(\(encodedTxt))[0]);}"
            wv.evaluateJavaScript(js, completionHandler: nil)
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

        if window == nil {
            window = UIWindow(windowScene: windowScene)
        }
        if !(window?.rootViewController is MasrofiViewController) {
            window?.rootViewController = MasrofiViewController()
        }
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
