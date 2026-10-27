import Foundation

/// The in-app UI language. Japanese is the app's native/source language, so it
/// needs no entry in `Localization.translations` — every translation key below
/// is itself the original Japanese string.
enum AppLanguage: String, Codable, CaseIterable, Identifiable {
    case japanese = "ja"
    case english = "en"
    case chinese = "zh"
    case spanish = "es"

    var id: String { rawValue }

    /// Shown in the language picker itself, always in that language's own script.
    var nativeName: String {
        switch self {
        case .japanese: return "日本語"
        case .english: return "English"
        case .chinese: return "中文"
        case .spanish: return "Español"
        }
    }
}

enum Localization {
    /// Keyed by the original Japanese UI string (the app's native-language source
    /// of truth), mapping to English/Chinese/Spanish translations. Japanese itself
    /// needs no entry — the key IS the Japanese text, returned as-is by `AppStore.t`
    /// whenever no entry exists (which also makes an untranslated key a harmless,
    /// never-blank fallback).
    static let translations: [String: [AppLanguage: String]] = [
        // MARK: - Settings / language picker
        "言語": [.english: "Language", .chinese: "语言", .spanish: "Idioma"],
        "設定": [.english: "Settings", .chinese: "设置", .spanish: "Configuración"],
        "外観モード": [.english: "Appearance Mode", .chinese: "外观模式", .spanish: "Modo de apariencia"],
        "モード": [.english: "Mode", .chinese: "模式", .spanish: "Modo"],
        "システムに合わせる": [.english: "Match System", .chinese: "跟随系统", .spanish: "Igual que el sistema"],
        "ライト": [.english: "Light", .chinese: "浅色", .spanish: "Claro"],
        "ダーク": [.english: "Dark", .chinese: "深色", .spanish: "Oscuro"],
        "ホーム画面の背景": [.english: "Home Screen Background", .chinese: "主屏幕背景", .spanish: "Fondo de la pantalla de inicio"],
        "背景色": [.english: "Background Color", .chinese: "背景颜色", .spanish: "Color de fondo"],
        "画像・GIF・動画（mp4/mov/m4v）を背景に設定できます。動画・GIFは自動でループ再生されます。": [
            .english: "You can set an image, GIF, or video (mp4/mov/m4v) as the background. Videos and GIFs loop automatically.",
            .chinese: "可以将图片、GIF 或视频（mp4/mov/m4v）设置为背景。视频和 GIF 会自动循环播放。",
            .spanish: "Puedes establecer una imagen, GIF o video (mp4/mov/m4v) como fondo. Los videos y GIF se reproducen en bucle automáticamente."
        ],
        "背景メディアを選択…": [.english: "Choose Background Media…", .chinese: "选择背景媒体…", .spanish: "Elegir medio de fondo…"],
        "メディアをやめて色に戻す": [.english: "Remove Media and Use Color", .chinese: "取消媒体并恢复为颜色", .spanish: "Quitar medio y volver al color"],
        "背景の履歴": [.english: "Background History", .chinese: "背景历史记录", .spanish: "Historial de fondos"],
        "履歴から削除": [.english: "Remove from History", .chinese: "从历史记录中删除", .spanish: "Eliminar del historial"],

        // MARK: - Sidebar / tabs
        "ホーム": [.english: "Home", .chinese: "主页", .spanish: "Inicio"],
        "動画": [.english: "Video", .chinese: "视频", .spanish: "Video"],
        "ファイル": [.english: "Files", .chinese: "文件", .spanish: "Archivos"],
        "タイムテーブル": [.english: "Timetable", .chinese: "时间表", .spanish: "Horario"],
        "電卓": [.english: "Calculator", .chinese: "计算器", .spanish: "Calculadora"],
        "学習": [.english: "Study", .chinese: "学习", .spanish: "Estudio"],
        "インポート": [.english: "Import", .chinese: "导入", .spanish: "Importar"],
        "ノート": [.english: "Notes", .chinese: "笔记", .spanish: "Notas"],
        "タイマー": [.english: "Timer", .chinese: "计时器", .spanish: "Temporizador"],
        "タスク": [.english: "Tasks", .chinese: "任务", .spanish: "Tareas"],
        "今日": [.english: "Today", .chinese: "今天", .spanish: "Hoy"],
        "統計": [.english: "Statistics", .chinese: "统计", .spanish: "Estadísticas"],
        "サイドバーをリセット": [.english: "Reset Sidebar", .chinese: "重置侧边栏", .spanish: "Restablecer barra lateral"],

        // MARK: - Common actions
        "追加": [.english: "Add", .chinese: "添加", .spanish: "Añadir"],
        "作成": [.english: "Create", .chinese: "创建", .spanish: "Crear"],
        "保存": [.english: "Save", .chinese: "保存", .spanish: "Guardar"],
        "キャンセル": [.english: "Cancel", .chinese: "取消", .spanish: "Cancelar"],
        "削除": [.english: "Delete", .chinese: "删除", .spanish: "Eliminar"],
        "編集": [.english: "Edit", .chinese: "编辑", .spanish: "Editar"],
        "開く": [.english: "Open", .chinese: "打开", .spanish: "Abrir"],
        "検索": [.english: "Search", .chinese: "搜索", .spanish: "Buscar"],
        "名前を変更": [.english: "Rename", .chinese: "重命名", .spanish: "Cambiar nombre"],
        "次へ": [.english: "Next", .chinese: "下一题", .spanish: "Siguiente"],
        "エラー": [.english: "Error", .chinese: "错误", .spanish: "Error"],
        "タイトル": [.english: "Title", .chinese: "标题", .spanish: "Título"],
        "説明": [.english: "Description", .chinese: "说明", .spanish: "Descripción"],
        "ラベル": [.english: "Label", .chinese: "标签", .spanish: "Etiqueta"],
        "色": [.english: "Color", .chinese: "颜色", .spanish: "Color"],
        "メモ": [.english: "Note", .chinese: "备注", .spanish: "Nota"],
        "日付": [.english: "Date", .chinese: "日期", .spanish: "Fecha"],
        "開始": [.english: "Start", .chinese: "开始", .spanish: "Inicio"],
        "終了": [.english: "End", .chinese: "结束", .spanish: "Fin"],
        "期限": [.english: "Due Date", .chinese: "截止日期", .spanish: "Fecha límite"],
        "期限を設定": [.english: "Set Due Date", .chinese: "设置截止日期", .spanish: "Establecer fecha límite"],
        "完了": [.english: "Done", .chinese: "完成", .spanish: "Completado"],

        // MARK: - Folders (shared across Video / Study / PDF)
        "フォルダ": [.english: "Folder", .chinese: "文件夹", .spanish: "Carpeta"],
        "フォルダー": [.english: "Folders", .chinese: "文件夹", .spanish: "Carpetas"],
        "フォルダ1": [.english: "Folder 1", .chinese: "文件夹1", .spanish: "Carpeta 1"],
        "フォルダ2": [.english: "Folder 2", .chinese: "文件夹2", .spanish: "Carpeta 2"],
        "フォルダなし": [.english: "No Folder", .chinese: "无文件夹", .spanish: "Sin carpeta"],
        "フォルダを選択…": [.english: "Select a Folder…", .chinese: "选择文件夹…", .spanish: "Selecciona una carpeta…"],
        "フォルダ名": [.english: "Folder Name", .chinese: "文件夹名称", .spanish: "Nombre de la carpeta"],
        "フォルダ名を変更": [.english: "Rename Folder", .chinese: "重命名文件夹", .spanish: "Cambiar nombre de carpeta"],
        "新しいフォルダ": [.english: "New Folder", .chinese: "新建文件夹", .spanish: "Nueva carpeta"],

        // MARK: - Home / Files
        "Finderからファイルをここにドラッグ＆ドロップして置けます": [
            .english: "Drag and drop files here from Finder",
            .chinese: "可以从 Finder 将文件拖放到这里",
            .spanish: "Puedes arrastrar y soltar archivos aquí desde Finder"
        ],
        "Finderで表示": [.english: "Show in Finder", .chinese: "在 Finder 中显示", .spanish: "Mostrar en Finder"],
        "ファイルがありません。「追加」から取り込んでください。": [
            .english: "No files yet. Add some using “Add.”",
            .chinese: "没有文件。请通过「添加」导入。",
            .spanish: "No hay archivos. Agrégalos con «Añadir»."
        ],

        // MARK: - Video
        "動画リンクを追加": [.english: "Add Video Link", .chinese: "添加视频链接", .spanish: "Añadir enlace de video"],
        "URL（YouTubeなど）": [.english: "URL (YouTube, etc.)", .chinese: "URL（如 YouTube）", .spanish: "URL (YouTube, etc.)"],
        "セクションを表示": [.english: "Show Section", .chinese: "显示区域", .spanish: "Mostrar sección"],
        "セクションを隠す": [.english: "Hide Section", .chinese: "隐藏区域", .spanish: "Ocultar sección"],
        "動画プレイヤー": [.english: "Video Player", .chinese: "视频播放器", .spanish: "Reproductor de video"],
        "右のフォルダから動画を選択してください": [
            .english: "Select a video from the folder on the right",
            .chinese: "请从右侧文件夹中选择视频",
            .spanish: "Selecciona un video desde la carpeta de la derecha"
        ],
        "動画ファイル": [.english: "Video Files", .chinese: "视频文件", .spanish: "Archivos de video"],
        "保存した動画（すべて）": [.english: "Saved Videos (All)", .chinese: "已保存的视频（全部）", .spanish: "Videos guardados (todos)"],
        "動画がありません": [.english: "No videos", .chinese: "没有视频", .spanish: "No hay videos"],

        // MARK: - Timetable
        "予定を追加": [.english: "Add Event", .chinese: "添加日程", .spanish: "Añadir evento"],
        "予定を編集": [.english: "Edit Event", .chinese: "编辑日程", .spanish: "Editar evento"],
        "週": [.english: "Week", .chinese: "周", .spanish: "Semana"],
        "週A": [.english: "Week A", .chinese: "周A", .spanish: "Semana A"],
        "週B": [.english: "Week B", .chinese: "周B", .spanish: "Semana B"],
        "毎週": [.english: "Every Week", .chinese: "每周", .spanish: "Cada semana"],
        "曜日": [.english: "Day of Week", .chinese: "星期", .spanish: "Día de la semana"],
        "月": [.english: "Mon", .chinese: "一", .spanish: "Lun"],
        "火": [.english: "Tue", .chinese: "二", .spanish: "Mar"],
        "水": [.english: "Wed", .chinese: "三", .spanish: "Mié"],
        "木": [.english: "Thu", .chinese: "四", .spanish: "Jue"],
        "金": [.english: "Fri", .chinese: "五", .spanish: "Vie"],
        "土": [.english: "Sat", .chinese: "六", .spanish: "Sáb"],
        "日": [.english: "Sun", .chinese: "日", .spanish: "Dom"],
        "月曜日": [.english: "Monday", .chinese: "星期一", .spanish: "Lunes"],
        "火曜日": [.english: "Tuesday", .chinese: "星期二", .spanish: "Martes"],
        "水曜日": [.english: "Wednesday", .chinese: "星期三", .spanish: "Miércoles"],
        "木曜日": [.english: "Thursday", .chinese: "星期四", .spanish: "Jueves"],
        "金曜日": [.english: "Friday", .chinese: "星期五", .spanish: "Viernes"],
        "土曜日": [.english: "Saturday", .chinese: "星期六", .spanish: "Sábado"],
        "日曜日": [.english: "Sunday", .chinese: "星期日", .spanish: "Domingo"],

        // MARK: - SNS
        "SNSリンクを追加": [.english: "Add SNS Link", .chinese: "添加社交链接", .spanish: "Añadir enlace de redes sociales"],
        "SNSリンクを追加してください": [.english: "Please add an SNS link", .chinese: "请添加社交链接", .spanish: "Añade un enlace de redes sociales"],
        "サービス名（例: Instagram）": [.english: "Service Name (e.g. Instagram)", .chinese: "服务名称（例如：Instagram）", .spanish: "Nombre del servicio (p. ej., Instagram)"],
        "登録済みリンク": [.english: "Registered Links", .chinese: "已添加的链接", .spanish: "Enlaces registrados"],

        // MARK: - Calculator
        "関数": [.english: "Functions", .chinese: "函数", .spanish: "Funciones"],
        "関数パネルを表示": [.english: "Show Function Panel", .chinese: "显示函数面板", .spanish: "Mostrar panel de funciones"],
        "履歴": [.english: "History", .chinese: "历史记录", .spanish: "Historial"],
        "キーボードでも入力できます（数字・+ - × ÷・Enter・Delete）": [
            .english: "You can also type with the keyboard (numbers, + - × ÷, Enter, Delete)",
            .chinese: "也可以使用键盘输入（数字・+ - × ÷・Enter・Delete）",
            .spanish: "También puedes escribir con el teclado (números, + - × ÷, Enter, Supr)"
        ],

        // MARK: - Todo
        "Todoを追加": [.english: "Add Todo", .chinese: "添加待办事项", .spanish: "Añadir tarea"],
        "Todoを追加してください": [.english: "Please add a todo", .chinese: "请添加待办事项", .spanish: "Añade una tarea"],
        "Todoを編集": [.english: "Edit Todo", .chinese: "编辑待办事项", .spanish: "Editar tarea"],
        "所要時間（分）": [.english: "Duration (min)", .chinese: "所需时间（分钟）", .spanish: "Duración (min)"],

        // MARK: - Study
        "学習フォルダ": [.english: "Study Folders", .chinese: "学习文件夹", .spanish: "Carpetas de estudio"],
        "4択テストを開始": [.english: "Start 4-Choice Quiz", .chinese: "开始四选一测验", .spanish: "Iniciar cuestionario de 4 opciones"],
        "最初からやり直す": [.english: "Start Over", .chinese: "从头开始", .spanish: "Empezar de nuevo"],
        "このフォルダにはまだクイズがありません。インポートタブからCSVで追加してください。": [
            .english: "This folder has no quizzes yet. Add some via CSV from the Import tab.",
            .chinese: "此文件夹还没有测验。请从「导入」标签页通过 CSV 添加。",
            .spanish: "Esta carpeta aún no tiene cuestionarios. Añádelos mediante CSV desde la pestaña Importar."
        ],
        "このフォルダにはまだクイズがありません": [.english: "This folder has no quizzes yet", .chinese: "此文件夹还没有测验", .spanish: "Esta carpeta aún no tiene cuestionarios"],
        "テスト終了！": [.english: "Quiz Complete!", .chinese: "测验结束！", .spanish: "¡Cuestionario terminado!"],
        "もう一度挑戦する": [.english: "Try Again", .chinese: "再挑战一次", .spanish: "Intentar de nuevo"],
        "クイズ一覧に戻る": [.english: "Back to Quiz List", .chinese: "返回测验列表", .spanish: "Volver a la lista de cuestionarios"],
        "未挑戦": [.english: "Not Attempted", .chinese: "未挑战", .spanish: "Sin intentar"],
        "左のフォルダを選択するか、新規作成してください": [
            .english: "Select a folder on the left or create a new one",
            .chinese: "请选择左侧文件夹或新建一个",
            .spanish: "Selecciona una carpeta a la izquierda o crea una nueva"
        ],

        // MARK: - Import
        "インポート先フォルダ": [.english: "Import Destination Folder", .chinese: "导入目标文件夹", .spanish: "Carpeta de destino de importación"],
        "CSVファイルを選択してインポート": [.english: "Choose a CSV File to Import", .chinese: "选择 CSV 文件导入", .spanish: "Elegir un archivo CSV para importar"],
        "コピー＆ペーストでインポート": [.english: "Import by Copy & Paste", .chinese: "通过复制粘贴导入", .spanish: "Importar mediante copiar y pegar"],
        "貼り付けた内容をインポート": [.english: "Import Pasted Content", .chinese: "导入粘贴的内容", .spanish: "Importar contenido pegado"],
        "ファイルを読み込めませんでした。": [.english: "Could not read the file.", .chinese: "无法读取文件。", .spanish: "No se pudo leer el archivo."],
        "2つの形式に対応しています。①4択クイズ形式：「質問,選択肢1,選択肢2,選択肢3,選択肢4,正解の番号(1〜4)」の6列。②単語帳形式：「単語, 意味」の2列（例: Apple, りんご）— 他の単語の意味が自動でダミーの選択肢になり4択クイズになります（最低4語必要）。1行目に見出しがあっても自動でスキップされます。": [
            .english: "Two formats are supported. ① Multiple-choice quiz format: 6 columns — “question, choice 1, choice 2, choice 3, choice 4, correct answer number (1–4)”. ② Flashcard format: 2 columns — “word, definition” (e.g. Apple, a round fruit) — the other words' definitions automatically become the wrong-answer choices, turning it into a 4-choice quiz (at least 4 words are required). A header row, if present, is skipped automatically.",
            .chinese: "支持两种格式。①四选一测验格式：「问题,选项1,选项2,选项3,选项4,正确答案编号(1~4)」共6列。②单词卡格式：「单词, 含义」共2列（例如：Apple, 苹果）— 其他单词的含义会自动成为干扰选项，组成四选一测验（至少需要4个单词）。如果第一行是标题行，会自动跳过。",
            .spanish: "Se admiten dos formatos. ① Formato de cuestionario de opción múltiple: 6 columnas — «pregunta, opción1, opción2, opción3, opción4, número de respuesta correcta (1-4)». ② Formato de tarjetas: 2 columnas — «palabra, significado» (p. ej., Apple, una fruta redonda) — los significados de las otras palabras se convierten automáticamente en opciones incorrectas, formando un cuestionario de 4 opciones (se necesitan al menos 4 palabras). Si hay una fila de encabezado, se omite automáticamente."
        ],
        "上と同じ形式のテキストを直接貼り付けられます。例:\nApple, りんご\nBanana, バナナ\nCherry, さくらんぼ\nGrape, ぶどう": [
            .english: "You can paste text in the same format above. Example:\nApple, a round fruit that grows on trees\nBanana, a long yellow fruit\nCherry, a small round red fruit\nGrape, a small fruit that grows in bunches",
            .chinese: "可以直接粘贴与上面相同格式的文本。例如：\nApple, 苹果\nBanana, 香蕉\nCherry, 樱桃\nGrape, 葡萄",
            .spanish: "Puedes pegar texto con el mismo formato de arriba. Ejemplo:\nApple, manzana\nBanana, plátano\nCherry, cereza\nGrape, uva"
        ],

        // MARK: - Notes
        "カテゴリー": [.english: "Category", .chinese: "分类", .spanish: "Categoría"],
        "カテゴリーを選択": [.english: "Select a Category", .chinese: "选择分类", .spanish: "Selecciona una categoría"],
        "新しいカテゴリー": [.english: "New Category", .chinese: "新分类", .spanish: "Nueva categoría"],
        "新規ノート": [.english: "New Note", .chinese: "新建笔记", .spanish: "Nueva nota"],
        "新しいノート": [.english: "New Note", .chinese: "新笔记", .spanish: "Nueva nota"],
        "ノートを選択するか、新規作成してください": [
            .english: "Select a note or create a new one",
            .chinese: "请选择笔记或新建一篇",
            .spanish: "Selecciona una nota o crea una nueva"
        ],
        "PDFで保存": [.english: "Save as PDF", .chinese: "保存为 PDF", .spanish: "Guardar como PDF"],
        "ノート.pdf": [.english: "Note.pdf", .chinese: "笔记.pdf", .spanish: "Nota.pdf"],

        // MARK: - PDF Library
        "PDFライブラリ": [.english: "PDF Library", .chinese: "PDF 资料库", .spanish: "Biblioteca de PDF"],
        "PDFをアップロード": [.english: "Upload PDF", .chinese: "上传 PDF", .spanish: "Subir PDF"],
        "PDFをアップロードして、選べるセクション・フォルダーなどを作成可能": [
            .english: "Upload PDFs to organize them into selectable sections and folders",
            .chinese: "上传 PDF，即可创建可选择的分区、文件夹等",
            .spanish: "Sube PDF para crear secciones y carpetas seleccionables"
        ],
        "すべてのPDF": [.english: "All PDFs", .chinese: "全部 PDF", .spanish: "Todos los PDF"],
        "PDFがありません": [.english: "No PDFs", .chinese: "没有 PDF", .spanish: "No hay PDF"],
        "選択されたPDFを展開する場所": [.english: "Selected PDF Will Open Here", .chinese: "所选 PDF 将在此展开", .spanish: "El PDF seleccionado se mostrará aquí"],
        "左のリストからPDFを選択してください": [
            .english: "Select a PDF from the list on the left",
            .chinese: "请从左侧列表中选择 PDF",
            .spanish: "Selecciona un PDF de la lista de la izquierda"
        ],

        // MARK: - Timer
        "何の作業をしていますか？": [.english: "What are you working on?", .chinese: "你在做什么工作？", .spanish: "¿En qué estás trabajando?"],
        "作業": [.english: "Work", .chinese: "工作", .spanish: "Trabajo"],
        "停止": [.english: "Stop", .chinese: "停止", .spanish: "Detener"],
        "他のタブに移動したりウィンドウが背面にあっても、タイマーは止まらず動き続けます。": [
            .english: "The timer keeps running even if you switch tabs or the window is in the background.",
            .chinese: "即使切换到其他标签页或窗口位于后台，计时器也会持续运行不会停止。",
            .spanish: "El temporizador sigue funcionando aunque cambies de pestaña o la ventana quede en segundo plano."
        ],
        "記録": [.english: "Records", .chinese: "记录", .spanish: "Registros"],
        "まだ記録がありません": [.english: "No records yet", .chinese: "还没有记录", .spanish: "Aún no hay registros"],

        // MARK: - Task / Today
        "タスクを作成": [.english: "Create Task", .chinese: "创建任务", .spanish: "Crear tarea"],
        "タスク名": [.english: "Task Name", .chinese: "任务名称", .spanish: "Nombre de la tarea"],
        "時間": [.english: "Hours", .chinese: "时间", .spanish: "Horas"],
        "まだタスクがありません": [.english: "No tasks yet", .chinese: "还没有任务", .spanish: "Aún no hay tareas"],
        "サブタスク": [.english: "Subtask", .chinese: "子任务", .spanish: "Subtarea"],
        "細かいタスクを追加": [.english: "Add a Subtask", .chinese: "添加细分任务", .spanish: "Añadir una subtarea"],
        "ここに追加したタスクは、期限が必ず「今日」に設定されます。": [
            .english: "Tasks added here always have their due date set to “Today.”",
            .chinese: "在此处添加的任务，期限会自动设为「今天」。",
            .spanish: "Las tareas añadidas aquí siempre tienen la fecha límite fijada en «Hoy»."
        ],

        // MARK: - Statistics
        "合計（秒）": [.english: "Total (Seconds)", .chinese: "合计（秒）", .spanish: "Total (segundos)"],
        "合計（時間）": [.english: "Total (Hours)", .chinese: "合计（小时）", .spanish: "Total (horas)"],
        "合計（日）": [.english: "Total (Days)", .chinese: "合计（天）", .spanish: "Total (días)"],
        "クイズ回答回数": [.english: "Quiz Attempts", .chinese: "测验答题次数", .spanish: "Intentos de cuestionario"],
        "全体正答率": [.english: "Overall Accuracy", .chinese: "总体正确率", .spanish: "Precisión general"],
        "完了したタスク数": [.english: "Completed Tasks", .chinese: "已完成任务数", .spanish: "Tareas completadas"],
        "完了したサブタスク数": [.english: "Completed Subtasks", .chinese: "已完成子任务数", .spanish: "Subtareas completadas"],
        "期間ごとのグラフ": [.english: "Chart by Period", .chinese: "按时间段显示的图表", .spanish: "Gráfico por período"],
        "期間": [.english: "Period", .chinese: "时间段", .spanish: "Período"],
        "この期間の記録がありません": [.english: "No records for this period", .chinese: "该时间段内没有记录", .spanish: "No hay registros para este período"],
        "学習フォルダがまだありません": [.english: "No study folders yet", .chinese: "还没有学习文件夹", .spanish: "Aún no hay carpetas de estudio"],
        "3日": [.english: "3 Days", .chinese: "3天", .spanish: "3 días"],
        "1週間": [.english: "1 Week", .chinese: "1周", .spanish: "1 semana"],
        "2週間": [.english: "2 Weeks", .chinese: "2周", .spanish: "2 semanas"],
        "3週間": [.english: "3 Weeks", .chinese: "3周", .spanish: "3 semanas"],
        "1ヶ月": [.english: "1 Month", .chinese: "1个月", .spanish: "1 mes"],
        "3ヶ月": [.english: "3 Months", .chinese: "3个月", .spanish: "3 meses"],

        // MARK: - Format-string templates (keep their %-placeholders intact)
        "%.0f 秒": [.english: "%.0f sec", .chinese: "%.0f 秒", .spanish: "%.0f s"],
        "%.1f 時間": [.english: "%.1f hr", .chinese: "%.1f 小时", .spanish: "%.1f h"],
        "%.2f 日": [.english: "%.2f days", .chinese: "%.2f 天", .spanish: "%.2f días"],
        "%.2f 時間": [.english: "%.2f hr", .chinese: "%.2f 小时", .spanish: "%.2f h"],
        "%d 件": [.english: "%d", .chinese: "%d 项", .spanish: "%d"],
        "%d 回": [.english: "%d", .chinese: "%d 次", .spanish: "%d"],
        "%d件のクイズをインポートしました。": [
            .english: "Imported %d quizzes.",
            .chinese: "已导入 %d 个测验。",
            .spanish: "Se importaron %d cuestionarios."
        ],
        "%d件のクイズをインポートしました（%d行をスキップ）。": [
            .english: "Imported %d quizzes (%d rows skipped).",
            .chinese: "已导入 %d 个测验（跳过了 %d 行）。",
            .spanish: "Se importaron %d cuestionarios (se omitieron %d filas)."
        ],
        "インポートできる内容がありませんでした（%d行をスキップ）。": [
            .english: "Nothing could be imported (%d rows skipped).",
            .chinese: "没有可导入的内容（跳过了 %d 行）。",
            .spanish: "No había contenido para importar (se omitieron %d filas)."
        ],
        "単語帳形式（単語, 意味）は4択の選択肢を作るために最低4語必要です（現在%d語のみ貼り付けられています）。": [
            .english: "Flashcard format (word, definition) needs at least 4 words to build 4-choice answers (only %d word(s) pasted so far).",
            .chinese: "单词卡格式（单词，含义）至少需要4个单词才能生成四选一选项（目前只粘贴了 %d 个单词）。",
            .spanish: "El formato de tarjetas (palabra, significado) necesita al menos 4 palabras para crear opciones de 4 respuestas (actualmente solo se han pegado %d palabra(s))."
        ],
        "「%@」の意味は？": [
            .english: "What does “%@” mean?",
            .chinese: "“%@”是什么意思？",
            .spanish: "¿Qué significa “%@”?"
        ],
        "問題 %d / %d": [.english: "Question %d / %d", .chinese: "题目 %d / %d", .spanish: "Pregunta %d / %d"],
        "完了 %d / %d 件・合計見積もり %d 分": [
            .english: "Done %d / %d · Est. total %d min",
            .chinese: "完成 %d / %d 项・预计总计 %d 分钟",
            .spanish: "Hecho %d / %d · Total estimado %d min"
        ],
        "所要時間: %d分": [.english: "Duration: %d min", .chinese: "所需时间：%d 分钟", .spanish: "Duración: %d min"]
    ]
}
