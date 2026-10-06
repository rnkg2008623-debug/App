import AppKit
import CoreGraphics
import CoreText

enum PDFExporter {
    static func export(title: String, content: String, to url: URL) {
        let pageSize = CGSize(width: 612, height: 792)
        let margin: CGFloat = 48

        guard let consumer = CGDataConsumer(url: url as CFURL) else { return }
        var mediaBox = CGRect(origin: .zero, size: pageSize)
        guard let context = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else { return }

        let titleFont = NSFont.boldSystemFont(ofSize: 20)
        let bodyFont = NSFont.systemFont(ofSize: 13)
        let titleAttrs: [NSAttributedString.Key: Any] = [.font: titleFont]
        let bodyAttrs: [NSAttributedString.Key: Any] = [.font: bodyFont]

        let fullText = NSMutableAttributedString(string: title + "\n\n", attributes: titleAttrs)
        fullText.append(NSAttributedString(string: content, attributes: bodyAttrs))

        let framesetter = CTFramesetterCreateWithAttributedString(fullText as CFAttributedString)
        let textLength = fullText.length
        var textRangeStart = 0

        let textArea = CGRect(
            x: margin,
            y: margin,
            width: pageSize.width - margin * 2,
            height: pageSize.height - margin * 2
        )
        let path = CGMutablePath()
        path.addRect(textArea)

        repeat {
            context.beginPDFPage(nil)
            context.saveGState()
            context.translateBy(x: 0, y: pageSize.height)
            context.scaleBy(x: 1, y: -1)

            let frame = CTFramesetterCreateFrame(framesetter, CFRangeMake(textRangeStart, 0), path, nil)
            CTFrameDraw(frame, context)

            let visibleRange = CTFrameGetVisibleStringRange(frame)
            textRangeStart += visibleRange.length

            context.restoreGState()
            context.endPDFPage()

            if visibleRange.length == 0 { break }
        } while textRangeStart < textLength

        context.closePDF()
    }
}
