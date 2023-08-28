//
//  ShareViewController.swift
//  ShareExtension
//
//  Created by Tomasz Baranowicz on 03/04/2023.
//

import UIKit
import Social
import MobileCoreServices
import Photos

class ShareViewController: SLComposeServiceViewController {
 let hostAppBundleIdentifier = "com.tombaranowicz.ScreenshotApp"
 let shareProtocol = "ShareMedia" //share url protocol (must be unique to your app, suggest using your apple bundle id, ie: `hostAppBundleIdentifier`)
 let sharedKey = "ShareKey"
 var sharedMedia: [SharedMediaFile] = []
 var sharedText: [String] = []
 let imageContentType = kUTTypeImage as String
 
 override func isContentValid() -> Bool {
   return true
 }
 
 override func viewDidLoad() {
       super.viewDidLoad();
   }

 override func viewDidAppear(_ animated: Bool) {
         super.viewDidAppear(animated)

   if let content = extensionContext!.inputItems[0] as? NSExtensionItem {
     if let contents = content.attachments {
       for (index, attachment) in (contents).enumerated() {
         if attachment.hasItemConformingToTypeIdentifier(imageContentType) {
           handleImages(content: content, attachment: attachment, index: index)
         }
       }
     }
   }
 }
 
 override func didSelectPost() {
       print("didSelectPost");
   }

 override func configurationItems() -> [Any]! {
   // To add configuration options via table cells at the bottom of the sheet, return an array of SLComposeSheetConfigurationItem here.
   return []
 }
 
 private func handleImages (content: NSExtensionItem, attachment: NSItemProvider, index: Int) {
   
   attachment.loadItem(forTypeIdentifier: kUTTypeImage as String, options: nil) { [weak self] data, error in
     if error == nil {
       var contentData: Data? = nil
       
       //data could be raw Data
       if let data = data as? Data {
         contentData = data
         
         //data could be an URL
       } else if let url = data as? URL {
         contentData = try? Data(contentsOf: url)
       }
       
       //data could be an UIImage object (e.g. ios11 screenshot editor)
       else if let imageData = data as? UIImage {
         contentData = imageData.pngData()
       }
       
       let this = self
       
       // proceed here with contentData
       let fileExtension = "png"//this.getExtension(from: url, type: .video)
       let newName = UUID().uuidString
       let newPath = FileManager.default
         .containerURL(forSecurityApplicationGroupIdentifier: "group.\(this!.hostAppBundleIdentifier)")!
         .appendingPathComponent("\(newName).\(fileExtension)")

       let copied = this!.saveFile(at: contentData!, to: newPath)
       if(copied) {
         this!.sharedMedia.append(SharedMediaFile(path: newPath.absoluteString, thumbnail: nil, duration: nil, type: .image))
       }

       // If this is the last item, save imagesData in userDefaults and redirect to host app
       if index == (content.attachments?.count)! - 1 {
         let userDefaults = UserDefaults(suiteName: "group.\(this!.hostAppBundleIdentifier)")
         userDefaults?.set(this!.toData(data: this!.sharedMedia), forKey: this!.sharedKey)
         userDefaults?.synchronize()
         this!.redirectToHostApp(type: .media)
       }
     }
   }
 }
 
 private func dismissWithError() {
   print("[ERROR] Error loading data!")
   let alert = UIAlertController(title: "Error", message: "Error loading data", preferredStyle: .alert)
   
   let action = UIAlertAction(title: "Error", style: .cancel) { _ in
     self.dismiss(animated: true, completion: nil)
   }
   
   alert.addAction(action)
   present(alert, animated: true, completion: nil)
   extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
 }
 
 private func redirectToHostApp(type: RedirectType) {
   let url = URL(string: "\(shareProtocol)://dataUrl=\(sharedKey)#\(type)")
   var responder = self as UIResponder?
   let selectorOpenURL = sel_registerName("openURL:")
   
   while (responder != nil) {
     if (responder?.responds(to: selectorOpenURL))! {
       let _ = responder?.perform(selectorOpenURL, with: url)
     }
     responder = responder!.next
   }
   extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
 }
 
 enum RedirectType {
   case media
   case text
   case file
 }
 
 func getExtension(from url: URL, type: SharedMediaType) -> String {
   let parts = url.lastPathComponent.components(separatedBy: ".")
   var ex: String? = nil
   if (parts.count > 1) {
     ex = parts.last
   }
   
   if (ex == nil) {
     switch type {
     case .image:
       ex = "PNG"
     case .video:
       ex = "MP4"
     case .file:
       ex = "TXT"
     }
   }
   return ex ?? "Unknown"
 }
 
 func getFileName(from url: URL) -> String {
   var name = url.lastPathComponent
   
   if (name == "") {
     name = UUID().uuidString + "." + getExtension(from: url, type: .file)
   }
   
   return name
 }
 
 func copyFile(at srcURL: URL, to dstURL: URL) -> Bool {
   do {
     if FileManager.default.fileExists(atPath: dstURL.path) {
       try FileManager.default.removeItem(at: dstURL)
     }
     try FileManager.default.copyItem(at: srcURL, to: dstURL)
   } catch (let error) {
     print("Cannot copy item at \(srcURL) to \(dstURL): \(error)")
     return false
   }
   return true
 }
  
  func saveFile(at data: Data, to dstURL: URL) -> Bool {
    do {
      if FileManager.default.fileExists(atPath: dstURL.path) {
        try FileManager.default.removeItem(at: dstURL)
      }
      try data.write(to: dstURL, options: .atomic)
    } catch (let error) {
      return false
    }
    return true
  }
 
 class SharedMediaFile: Codable {
   var path: String; // can be image, video or url path. It can also be text content
   var thumbnail: String?; // video thumbnail
   var duration: Double?; // video duration in milliseconds
   var type: SharedMediaType;
   
   
   init(path: String, thumbnail: String?, duration: Double?, type: SharedMediaType) {
     self.path = path
     self.thumbnail = thumbnail
     self.duration = duration
     self.type = type
   }
   
   // Debug method to print out SharedMediaFile details in the console
   func toString() {
     print("[SharedMediaFile] \n\tpath: \(self.path)\n\tthumbnail: \(self.thumbnail)\n\tduration: \(self.duration)\n\ttype: \(self.type)")
   }
 }
 
 enum SharedMediaType: Int, Codable {
   case image
   case video
   case file
 }
 
 func toData(data: [SharedMediaFile]) -> Data {
   let encodedData = try? JSONEncoder().encode(data)
   return encodedData!
 }
}

extension Array {
 subscript (safe index: UInt) -> Element? {
   return Int(index) < count ? self[Int(index)] : nil
 }
}
