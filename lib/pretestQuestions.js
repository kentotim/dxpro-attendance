// ============================================================
// lib/pretestQuestions.js
// 入社前テスト 問題データ（選択式20問 + 記述式10問 / 言語）
//
// mc[]: 選択式
//   { q: '問題文', opts: ['A. ...','B. ...','C. ...','D. ...'], ans: 'A'|'B'|'C'|'D', diff: 'VE'|'EM'|'H'|'VH' }
//   diff: VE=非常に易しい / EM=中間 / H=難しい / VH=非常に難しい
//
// essay[]: 記述式
//   { q: '問題文', keywords: ['採点キーワード', ...] }
// ============================================================

const LANG_TESTS = {

  // ──────────────────────────────────────────────────────────
  // Java
  // ──────────────────────────────────────────────────────────
  java: {
    title: 'Java テスト（選択式20問 + 記述式10問）',
    intro: 'Javaの基礎知識から応用・並行処理まで幅広く出題します。選択式は最も適切な選択肢を1つ選び、記述式は簡潔に述べてください。',
    mc: [
      // VE × 5
      { q: 'Javaで文字列の長さを取得するメソッドは？', opts: ['A. size()', 'B. count()', 'C. length()', 'D. len()'], ans: 'C', diff: 'VE' },
      { q: 'int 型フィールドのデフォルト値は？', opts: ['A. 0', 'B. null', 'C. 1', 'D. -1'], ans: 'A', diff: 'VE' },
      { q: 'System.out.println(10 / 3) の出力は？', opts: ['A. 3.33', 'B. 3', 'C. 4', 'D. コンパイルエラー'], ans: 'B', diff: 'VE' },
      { q: 'Javaでクラスを継承するキーワードは？', opts: ['A. implements', 'B. inherits', 'C. uses', 'D. extends'], ans: 'D', diff: 'VE' },
      { q: 'ArrayList に要素を追加するメソッドは？', opts: ['A. insert()', 'B. put()', 'C. add()', 'D. append()'], ans: 'C', diff: 'VE' },
      // EM × 8
      { q: 'HashMap でキーに null を使えるか？', opts: ['A. 使えない', 'B. 1つのみ使える', 'C. 複数使える', 'D. コンパイルエラー'], ans: 'B', diff: 'EM' },
      { q: 'checked 例外について正しい説明は？', opts: ['A. コンパイル時に宣言または捕捉が必須', 'B. 任意でよい', 'C. RuntimeExceptionを継承する', 'D. JVMのみが処理する'], ans: 'A', diff: 'EM' },
      { q: 'Java 8以降、インターフェースに追加できるようになったものは？', opts: ['A. コンストラクタ', 'B. インスタンスフィールド', 'C. defaultメソッド', 'D. 抽象クラスの実装'], ans: 'C', diff: 'EM' },
      { q: 'try-with-resources が自動的に呼び出すメソッドは？', opts: ['A. finalize()', 'B. close()', 'C. destroy()', 'D. dispose()'], ans: 'B', diff: 'EM' },
      { q: 'String オブジェクト同士を比較する際、内容が等しいかを確認する正しい方法は？', opts: ['A. == 演算子', 'B. equals() メソッド', 'C. compare() メソッド', 'D. match() メソッド'], ans: 'B', diff: 'EM' },
      { q: 'ArrayList の get(int index) の計算量は？', opts: ['A. O(1)', 'B. O(n)', 'C. O(log n)', 'D. O(n²)'], ans: 'A', diff: 'EM' },
      { q: 'Javaのスタックに積まれるものは？', opts: ['A. オブジェクトのインスタンス', 'B. クラス定義', 'C. ヒープ全体', 'D. メソッドフレームとローカル変数'], ans: 'D', diff: 'EM' },
      { q: 'StringBuilder が大量の文字列連結で String+ より優れる理由は？', opts: ['A. スレッドセーフ', 'B. 型安全', 'C. 可変バッファで新オブジェクト生成が不要', 'D. メモリ使用量が少ない'], ans: 'C', diff: 'EM' },
      // H × 4
      { q: 'volatile キーワードの主な効果は？', opts: ['A. アトミック操作の保証', 'B. スレッド間での変数の可視性を保証', 'C. 自動的なロック取得', 'D. GCの無効化'], ans: 'B', diff: 'H' },
      { q: 'ConcurrentHashMap が Collections.synchronizedMap より高い並行性を持つ理由は？', opts: ['A. スレッドセーフでない', 'B. nullキーを許容する', 'C. バケット単位のロックで並列書き込みが可能', 'D. 全操作がロックフリー'], ans: 'C', diff: 'H' },
      { q: 'ジェネリクスの型消去（Type Erasure）の説明として正しいものは？', opts: ['A. 実行時に型情報が保持される', 'B. コンパイル後に型パラメータの情報が削除される', 'C. キャストが不要になる', 'D. コンパイルエラーになる'], ans: 'B', diff: 'H' },
      { q: 'Java Memory Model の happens-before 関係の説明として正しいものは？', opts: ['A. コードの物理的な実行順序', 'B. スレッドの優先順位', 'C. 以前のアクションの結果が後続のアクションから必ず見えることを保証', 'D. GCの実行タイミング'], ans: 'C', diff: 'H' },
      // VH × 3
      { q: 'StampedLock の楽観読み取りの特徴として正しいものは？', opts: ['A. 常にロックを取得する', 'B. 読み取り後にスタンプを検証し競合があれば再読み取りする', 'C. 書き込みをブロックする', 'D. デッドロックを防止する'], ans: 'B', diff: 'VH' },
      { q: 'JITコンパイラが脱最適化（Deoptimization）を行う条件は？', opts: ['A. ヒープが満杯のとき', 'B. スレッド数が増えたとき', 'C. インライン化した仮定が実行時に崩れたとき', 'D. GC実行後'], ans: 'C', diff: 'VH' },
      { q: 'VarHandle（Java 9+）の主な目的は？', opts: ['A. リフレクションより安全・高速なアトミックなフィールド操作を提供', 'B. 変数の型安全なキャスト', 'C. ラムダ式の最適化', 'D. GCのチューニング'], ans: 'A', diff: 'VH' },
    ],
    essay: [
      { q: 'GCのSTW（Stop-The-World）とは何か、また影響を最小化する方法を説明してください。', keywords: ['stw', 'stop', 'pause', 'gc', 'g1', 'zgc', '一時停止', '停止'] },
      { q: 'Javaのメモリリークが発生しやすいケースを2つ挙げて、それぞれの対策を説明してください。', keywords: ['static', '参照', 'キャッシュ', 'リスナー', 'コレクション', '解放'] },
      { q: 'ExecutorService を使うメリットと、shutdown() を必ず呼ぶ理由を説明してください。', keywords: ['スレッドプール', 'リソース', 'shutdown', 'executor'] },
      { q: 'JPAでN+1問題が発生する原因と解決策を説明してください。', keywords: ['n+1', 'fetch', 'join', 'lazy', 'eager', 'クエリ'] },
      { q: 'Spring BootのDIコンテナの役割と @Autowired の仕組みを説明してください。', keywords: ['di', '依存', 'autowired', 'bean', 'inject', 'コンテナ'] },
      { q: 'Stream APIを使う利点と、並列ストリームの注意点を説明してください。', keywords: ['stream', 'parallel', '副作用', 'スレッド', '遅延', 'pipeline'] },
      { q: 'synchronized と ReentrantLock の使い分けを説明してください。', keywords: ['synchronized', 'reentrant', 'タイムアウト', '条件', 'lock'] },
      { q: 'JVMのメモリ構造（ヒープ・メタスペース・スタック）を説明してください。', keywords: ['heap', 'stack', 'metaspace', 'gc', 'jvm', 'ヒープ', 'スタック'] },
      { q: 'Javaでシリアライズを行う際のセキュリティリスクと対策を説明してください。', keywords: ['シリアライズ', 'rce', '改ざん', 'serializable', 'deserialize', 'バリデーション'] },
      { q: 'CIパイプラインでJavaアプリのテストを自動化する際に組み込むべきツールや手順を説明してください。', keywords: ['junit', 'maven', 'gradle', 'ci', 'テスト', '自動', 'lint', 'jacoco'] },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // JavaScript
  // ──────────────────────────────────────────────────────────
  javascript: {
    title: 'JavaScript テスト（選択式20問 + 記述式10問）',
    intro: 'JavaScriptの基礎から非同期処理・エンジン内部まで幅広く出題します。',
    mc: [
      // VE × 5
      { q: 'typeof null の結果は？', opts: ['A. "null"', 'B. "object"', 'C. "undefined"', 'D. "boolean"'], ans: 'B', diff: 'VE' },
      { q: '=== と == の主な違いは？', opts: ['A. === は型変換あり', 'B. どちらも同じ', 'C. === は型変換なし（厳密比較）', 'D. == のみブラウザで動く'], ans: 'C', diff: 'VE' },
      { q: 'const arr = [1,2,3]; arr.push(4); はエラーになるか？', opts: ['A. はい、constは変更不可', 'B. いいえ、constは再代入禁止だが変更は可', 'C. ArrayにはconstはNG', 'D. 実行時エラー'], ans: 'B', diff: 'VE' },
      { q: '0.1 + 0.2 === 0.3 の結果は？', opts: ['A. false', 'B. true', 'C. undefined', 'D. NaN'], ans: 'A', diff: 'VE' },
      { q: 'undefined と null の違いとして正しいものは？', opts: ['A. 同じ', 'B. nullは数値0と等価', 'C. undefinedは未定義、nullは意図的な空値', 'D. undefinedのtypeofはnull'], ans: 'C', diff: 'VE' },
      // EM × 8
      { q: 'var と let の主な違いは？', opts: ['A. letはグローバルスコープ', 'B. 違いはない', 'C. letはブロックスコープ、varは関数スコープ', 'D. varは使えない'], ans: 'C', diff: 'EM' },
      { q: 'Array.prototype.map() と forEach() の違いは？', opts: ['A. 同じ', 'B. mapは新配列を返す、forEachは返さない', 'C. forEachの方が速い', 'D. mapはbreak可能'], ans: 'B', diff: 'EM' },
      { q: 'async 関数の戻り値は常に何か？', opts: ['A. undefined', 'B. 値そのもの', 'C. callback', 'D. Promise'], ans: 'D', diff: 'EM' },
      { q: 'クロージャとは何か？', opts: ['A. 外部スコープへの参照を保持する内部関数', 'B. 無名関数', 'C. コールバック関数', 'D. グローバル変数へのアクセス'], ans: 'A', diff: 'EM' },
      { q: 'イベントバブリングとは？', opts: ['A. 親から子へとイベントが伝播する', 'B. 子から親へとイベントが伝播する', 'C. イベントが無効化される', 'D. 非同期キューに入る'], ans: 'B', diff: 'EM' },
      { q: 'Object.freeze() の効果は？', opts: ['A. 削除不可のみ', 'B. 参照型のみ適用', 'C. プロパティの追加・変更・削除が不可', 'D. シリアライズされる'], ans: 'C', diff: 'EM' },
      { q: 'Promiseの状態として存在しないものは？', opts: ['A. pending', 'B. fulfilled', 'C. rejected', 'D. suspended'], ans: 'D', diff: 'EM' },
      { q: 'アロー関数と通常関数の this の違いは？', opts: ['A. 違いはない', 'B. アロー関数はthisが常にundefined', 'C. アロー関数は定義時の外部スコープのthisを継承（レキシカルthis）', 'D. 通常関数はthisがundefined'], ans: 'C', diff: 'EM' },
      // H × 4
      { q: 'イベントループでMicrotaskキューが実行されるタイミングは？', opts: ['A. setTimeoutと同じタイミング', 'B. DOMの更新前のみ', 'C. fetchの後のみ', 'D. 各マクロタスク完了後、次のマクロタスク実行前'], ans: 'D', diff: 'H' },
      { q: 'WeakMap と Map の主な違いは？', opts: ['A. WeakMapは任意の型をキーに使える', 'B. WeakMapは順序を保持する', 'C. WeakMapのキーは弱参照でGCの対象になる', 'D. WeakMapはイテレータを持つ'], ans: 'C', diff: 'H' },
      { q: 'Symbol.iterator の用途は？', opts: ['A. オブジェクトのIDを生成', 'B. Promiseの解決を制御', 'C. Proxyのトラップ', 'D. カスタムイテレータを定義してfor...ofで使えるようにする'], ans: 'D', diff: 'H' },
      { q: 'Proxy オブジェクトの主な用途は？', opts: ['A. オブジェクトへの操作（get/set等）をインターセプトして独自処理を行う', 'B. 非同期処理の制御', 'C. メモリ管理', 'D. プロトタイプの継承'], ans: 'A', diff: 'H' },
      // VH × 3
      { q: 'V8エンジンのHidden Classが最適化に使われる理由は？', opts: ['A. GCを高速化するため', 'B. プロトタイプ検索を省略するため', 'C. ガベージコレクタの負荷を下げるため', 'D. 同じプロパティ構造のオブジェクトを型情報として共有しJITを最適化するため'], ans: 'D', diff: 'VH' },
      { q: 'SharedArrayBuffer と Atomics の組み合わせが解決する問題は？', opts: ['A. 非同期IOのボトルネック', 'B. CORSリクエストの制限', 'C. WebWorker間でのメモリ共有と競合状態の制御', 'D. サービスワーカーの更新'], ans: 'C', diff: 'VH' },
      { q: 'Temporal Dead Zone (TDZ) とは何か？', opts: ['A. let・constがホイストされているがアクセス不可な期間', 'B. setTimeoutの遅延ゾーン', 'C. GCによるオブジェクトの削除期間', 'D. 非同期処理のキャンセル期間'], ans: 'A', diff: 'VH' },
    ],
    essay: [
      { q: 'イベントループのマクロタスクとマイクロタスクの違いを説明し、具体的な例を挙げてください。', keywords: ['macro', 'micro', 'promise', 'settimeout', 'queue', 'マクロ', 'マイクロ'] },
      { q: 'クロージャの利点と、メモリリークを引き起こすケースを説明してください。', keywords: ['クロージャ', '参照', 'gc', '解放', 'スコープ'] },
      { q: 'Promise.all と Promise.allSettled の違いと使い分けを説明してください。', keywords: ['all', 'allsettled', 'reject', 'settled', '並列'] },
      { q: 'JavaScriptでプロトタイプチェーンがどのように動作するかを説明してください。', keywords: ['prototype', 'chain', '__proto__', '継承', 'プロトタイプ'] },
      { q: 'XSS攻撃の仕組みと、JavaScriptアプリケーションでの防止策を説明してください。', keywords: ['xss', 'エスケープ', 'サニタイズ', 'csp', 'innerhtml'] },
      { q: 'var のホイスティングとTDZの違いを具体例を使って説明してください。', keywords: ['hoisting', 'var', 'let', 'tdz', 'undefined'] },
      { q: 'Node.jsのストリームを使う利点と、大ファイル処理での活用方法を説明してください。', keywords: ['stream', 'pipe', 'メモリ', 'chunk', 'readable'] },
      { q: 'ESモジュール（ESM）と CommonJS の違いを説明してください。', keywords: ['esm', 'commonjs', 'import', 'require', '静的'] },
      { q: 'async/await を使う際の例外処理のベストプラクティスを説明してください。', keywords: ['try', 'catch', 'async', 'await', 'unhandled'] },
      { q: 'Webパフォーマンスの観点から、JavaScriptのバンドルとコード分割の重要性を説明してください。', keywords: ['bundle', 'chunk', 'lazy', 'split', '最適化', 'webpack'] },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // Python
  // ──────────────────────────────────────────────────────────
  python: {
    title: 'Python テスト（選択式20問 + 記述式10問）',
    intro: 'Pythonの基礎から非同期処理・メモリ管理まで幅広く出題します。',
    mc: [
      // VE × 5
      { q: 'リストとタプルのうち、Immutableなのはどちらか？', opts: ['A. リスト', 'B. どちらも', 'C. タプル', 'D. どちらでもない'], ans: 'C', diff: 'VE' },
      { q: 'print(type([])) の出力は？', opts: ['A. <class \'list\'>', 'B. <class \'tuple\'>', 'C. <class \'array\'>', 'D. <class \'sequence\'>'], ans: 'A', diff: 'VE' },
      { q: 'Pythonでリストの末尾に要素を追加するメソッドは？', opts: ['A. push()', 'B. insert()', 'C. append()', 'D. add()'], ans: 'C', diff: 'VE' },
      { q: 'range(3) で生成される値は？', opts: ['A. 1, 2, 3', 'B. 0, 1, 2, 3', 'C. 1, 2', 'D. 0, 1, 2'], ans: 'D', diff: 'VE' },
      { q: 'Pythonの // 演算子の意味は？', opts: ['A. 切り捨て除算', 'B. コメント', 'C. 剰余', 'D. 冪乗'], ans: 'A', diff: 'VE' },
      // EM × 8
      { q: 'Pythonのデコレータの主な用途は？', opts: ['A. クラスの継承', 'B. 関数やメソッドの振る舞いを変更・拡張する', 'C. メモリ管理', 'D. 型チェック'], ans: 'B', diff: 'EM' },
      { q: 'is と == の違いは？', opts: ['A. isは同一オブジェクト参照を比較、==は値を比較', 'B. 同じ', 'C. ==はメモリアドレス比較', 'D. isは型比較'], ans: 'A', diff: 'EM' },
      { q: 'GIL（Global Interpreter Lock）の主な影響は？', opts: ['A. マルチプロセスを妨げる', 'B. CPythonでは同時にCPUを使えるスレッドを1つに制限する', 'C. I/Oバウンド処理が遅くなる', 'D. 非同期処理が不可能になる'], ans: 'B', diff: 'EM' },
      { q: '[x*2 for x in range(5) if x%2==0] の結果は？', opts: ['A. [0, 2, 4, 6, 8]', 'B. [0, 4, 8]', 'C. [2, 4]', 'D. [0, 2, 4]'], ans: 'B', diff: 'EM' },
      { q: 'with open("file.txt") as f: を使う理由は？', opts: ['A. バイナリモードで開く', 'B. エラーを無視する', 'C. ブロック終了時に自動でファイルをクローズする', 'D. ファイルをロックする'], ans: 'C', diff: 'EM' },
      { q: 'ジェネレータ関数を定義するキーワードは？', opts: ['A. async', 'B. return', 'C. yield', 'D. generate'], ans: 'C', diff: 'EM' },
      { q: '*args と **kwargs の違いは？', opts: ['A. *argsは可変長位置引数、**kwargsは可変長キーワード引数', 'B. 同じ', 'C. **kwargsは位置引数のみ', 'D. *argsはキーワード引数'], ans: 'A', diff: 'EM' },
      { q: '__init__ メソッドの役割は？', opts: ['A. クラスの削除', 'B. インスタンス生成時の初期化', 'C. クラスメソッドの定義', 'D. 静的変数の定義'], ans: 'B', diff: 'EM' },
      // H × 4
      { q: 'functools.lru_cache の用途は？', opts: ['A. スレッド安全なキャッシュ', 'B. 非同期処理のキャッシュ', 'C. ディスクへの永続化', 'D. 関数の結果をキャッシュしてメモ化を行う'], ans: 'D', diff: 'H' },
      { q: 'asyncio の await の意味は？', opts: ['A. スレッドをブロックする', 'B. コルーチンの制御を一時的にイベントループに返しI/O待機中に他のタスクを実行させる', 'C. 並列スレッドを生成する', 'D. GCを呼び出す'], ans: 'B', diff: 'H' },
      { q: 'メタクラスの主な用途は？', opts: ['A. 例外処理', 'B. ファイル入出力', 'C. クラス生成プロセスをカスタマイズする', 'D. メモリ管理'], ans: 'C', diff: 'H' },
      { q: '__slots__ を使う主な目的は？', opts: ['A. インスタンスの __dict__ を省略してメモリを節約する', 'B. 属性の型を固定する', 'C. クラスをシールドする', 'D. イテレータを定義する'], ans: 'A', diff: 'H' },
      // VH × 3
      { q: 'GILを回避してCPUバウンド並列処理を行う最善の方法は？', opts: ['A. threading.Thread', 'B. asyncio', 'C. multiprocessing', 'D. concurrent.futures.ThreadPoolExecutor'], ans: 'C', diff: 'VH' },
      { q: 'ディスクリプタ（Descriptor）プロトコルで実装が必要なメソッドは？', opts: ['A. __init__ と __del__', 'B. __get__、__set__、__delete__ のいずれか', 'C. __str__ と __repr__', 'D. __iter__ と __next__'], ans: 'B', diff: 'VH' },
      { q: 'copy.deepcopy() が copy.copy() と異なる点は？', opts: ['A. 速度が速い', 'B. イミュータブルオブジェクトに使う', 'C. 参照をコピーする', 'D. ネストされたオブジェクトも含めて完全に新しいコピーを作成する'], ans: 'D', diff: 'VH' },
    ],
    essay: [
      { q: 'Pythonのメモリ管理（参照カウントとGC）の仕組みを説明してください。', keywords: ['参照カウント', 'gc', '循環参照', '解放'] },
      { q: 'asyncio と threading の使い分けを説明してください。', keywords: ['asyncio', 'threading', 'io', 'cpu', 'gil'] },
      { q: 'デコレータを使って関数の実行時間を計測する実装例を説明してください。', keywords: ['デコレータ', 'wrapper', 'time', '計測'] },
      { q: 'ジェネレータと通常のリスト返却の違いをメモリ効率の観点から説明してください。', keywords: ['ジェネレータ', 'yield', 'メモリ', '遅延'] },
      { q: 'contextlib.contextmanager を使ったコンテキストマネージャの実装を説明してください。', keywords: ['contextmanager', 'with', 'yield', '例外'] },
      { q: 'Pythonのパッケージ管理（pip, venv）のベストプラクティスを説明してください。', keywords: ['pip', 'venv', '依存', '隔離'] },
      { q: 'PythonでのDBアクセスでSQLインジェクションを防ぐ方法を説明してください。', keywords: ['プレースホルダ', 'パラメータ', 'sql', '安全', '注入'] },
      { q: 'Pythonの型ヒント（Type Hints）を使う利点を説明してください。', keywords: ['型ヒント', 'mypy', '可読性', '静的'] },
      { q: 'multiprocessing.Pool を使った並列処理の実装と注意点を説明してください。', keywords: ['pool', 'worker', '共有', 'process'] },
      { q: 'cProfileを使ったPythonコードのプロファイリング手法を説明してください。', keywords: ['profile', 'cprofile', 'ボトルネック', '計測'] },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // PHP
  // ──────────────────────────────────────────────────────────
  php: {
    title: 'PHP テスト（選択式20問 + 記述式10問）',
    intro: 'PHPの基礎からセキュリティ・パフォーマンスまで幅広く出題します。',
    mc: [
      // VE × 5
      { q: 'PHPで変数を宣言するときの先頭文字は？', opts: ['A. $', 'B. @', 'C. #', 'D. &'], ans: 'A', diff: 'VE' },
      { q: 'PHPで配列に末尾から要素を追加する最もシンプルな方法は？', opts: ['A. $arr.push()', 'B. array_add()', 'C. $arr[] = $value', 'D. array_insert()'], ans: 'C', diff: 'VE' },
      { q: 'PHPの === が == と異なる点は？', opts: ['A. 速度', 'B. 配列に使えない', 'C. 型と値を両方比較する', 'D. 文字列のみ有効'], ans: 'C', diff: 'VE' },
      { q: 'PHPでHTMLを安全に出力するための関数は？', opts: ['A. htmlspecialchars()', 'B. stripslashes()', 'C. urlencode()', 'D. strip_tags()'], ans: 'A', diff: 'VE' },
      { q: 'PHPで文字列を数値にキャストする正しい書き方は？', opts: ['A. (num)$s', 'B. intparse($s)', 'C. (int)$s または (float)$s', 'D. int($s)のみ'], ans: 'C', diff: 'VE' },
      // EM × 8
      { q: 'PDOのプリペアドステートメントを使う主な目的は？', opts: ['A. 高速化', 'B. キャッシュ', 'C. SQLインジェクション防止', 'D. 接続プール'], ans: 'C', diff: 'EM' },
      { q: 'session_start() を呼ぶタイミングは？', opts: ['A. HTMLの後', 'B. 出力の前（ヘッダー送信前）', 'C. いつでもよい', 'D. ファイルの末尾'], ans: 'B', diff: 'EM' },
      { q: 'require と include の違いは？', opts: ['A. requireは失敗するとFatal Error、includeはWarning', 'B. 同じ', 'C. includeは失敗するとFatal Error', 'D. requireはHTMLのみ'], ans: 'A', diff: 'EM' },
      { q: 'Composerの主な役割は？', opts: ['A. PHPのコンパイル', 'B. テスト実行', 'C. 依存ライブラリの管理とオートロード', 'D. データベース接続'], ans: 'C', diff: 'EM' },
      { q: 'array_map と array_filter の違いは？', opts: ['A. 同じ', 'B. array_mapは変換、array_filterは条件に合う要素を絞り込む', 'C. array_filterの方が速い', 'D. array_mapはキーを保持しない'], ans: 'B', diff: 'EM' },
      { q: 'PHPの名前空間（namespace）を使う理由は？', opts: ['A. 実行速度の向上', 'B. メモリ削減', 'C. クラス・関数名の衝突を防ぐ', 'D. オートロードを有効にする'], ans: 'C', diff: 'EM' },
      { q: 'ファイルアップロード時に検証すべき最重要項目は？', opts: ['A. MIMEタイプ・サイズ・拡張子を総合的に検証', 'B. ファイル名のみ', 'C. サイズのみ', 'D. 拡張子のみ'], ans: 'A', diff: 'EM' },
      { q: 'ob_start() の主な用途は？', opts: ['A. 出力バッファリングを開始する', 'B. セッションを開始する', 'C. オブジェクトをシリアライズする', 'D. データベースのバッファを設定する'], ans: 'A', diff: 'EM' },
      // H × 4
      { q: 'PHPのセッション固定攻撃を防ぐ方法は？', opts: ['A. セッションを暗号化する', 'B. ログイン後に session_regenerate_id(true) を呼ぶ', 'C. セッションIDを長くする', 'D. Cookieを無効にする'], ans: 'B', diff: 'H' },
      { q: 'PHP 8 の match 式が switch 文より優れる点は？', opts: ['A. 速度', 'B. 厳密比較（===）を使いブレーク不要で値を返せる', 'C. 文字列のみ対応', 'D. 条件数の制限がない'], ans: 'B', diff: 'H' },
      { q: 'PHP 8.1の Fiber の主な用途は？', opts: ['A. マルチスレッド処理', 'B. GCのトリガー', 'C. メモリプール', 'D. 中断・再開可能な軽量コルーチンで非同期処理を実現'], ans: 'D', diff: 'H' },
      { q: 'declare(strict_types=1) の効果は？', opts: ['A. スカラー型の暗黙の型変換を禁止し型宣言を厳密に適用する', 'B. クラスの型を固定する', 'C. 配列操作を高速化する', 'D. エラーをすべて例外に変換する'], ans: 'A', diff: 'H' },
      // VH × 3
      { q: 'ZendエンジンのOpcode Cacheの仕組みは？', opts: ['A. クエリをキャッシュする', 'B. ファイルシステムをキャッシュする', 'C. PHPスクリプトを事前コンパイルしたOpCodeをメモリに保持して再利用する', 'D. セッションをメモリに保持する'], ans: 'C', diff: 'VH' },
      { q: 'WeakReference を使う目的は？', opts: ['A. 型の弱化', 'B. オブジェクトへの参照をGCの対象を妨げずに保持する', 'C. 変数のコピーを避ける', 'D. シリアライズを高速化する'], ans: 'B', diff: 'VH' },
      { q: 'SplPriorityQueue の特徴は？', opts: ['A. 配列より低速', 'B. FIFOのみ', 'C. ソート済み配列と同じ', 'D. 優先度付きのヒープ構造でO(log n)の挿入/取り出しができる'], ans: 'D', diff: 'VH' },
    ],
    essay: [
      { q: 'PHPとWebサーバの連携（FPM/FastCGI）の仕組みを説明してください。', keywords: ['fpm', 'fastcgi', 'プロセス', 'リクエスト', 'ワーカー'] },
      { q: 'PDOのプリペアドステートメントを使ったSQLインジェクション防止の実装を説明してください。', keywords: ['pdo', 'prepare', 'プレースホルダ', 'バインド', 'sql'] },
      { q: 'PHPのセッション管理と安全なセッション設定を説明してください。', keywords: ['session', 'cookie', 'httponly', 'secure', '再生成'] },
      { q: 'ComposerのオートロードとPSR-4規約を説明してください。', keywords: ['composer', 'autoload', 'psr-4', '名前空間', 'クラス'] },
      { q: 'PHPの例外処理（try/catch/finally）とカスタム例外クラスの使い方を説明してください。', keywords: ['try', 'catch', 'finally', '例外', 'exception'] },
      { q: 'PHPでXSS攻撃を防ぐ方法を具体的に説明してください。', keywords: ['xss', 'htmlspecialchars', 'エスケープ', 'csp', 'サニタイズ'] },
      { q: 'PHP 8.1のFiberを使った非同期処理のユースケースを説明してください。', keywords: ['fiber', '非同期', 'コルーチン', '中断', '再開'] },
      { q: 'OPcacheを利用したパフォーマンス最適化を説明してください。', keywords: ['opcache', 'キャッシュ', 'opcode', 'メモリ', '最適化'] },
      { q: 'RESTful APIをPHPで実装する際の基本的な設計と実装方法を説明してください。', keywords: ['rest', 'api', 'route', 'json', 'http', 'メソッド'] },
      { q: 'PHPのデータベース接続でコネクションプールを活用する方法を説明してください。', keywords: ['コネクション', 'プール', 'pdo', 'mysqlnd', '接続'] },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // C#
  // ──────────────────────────────────────────────────────────
  csharp: {
    title: 'C# テスト（選択式20問 + 記述式10問）',
    intro: 'C#の基礎から非同期・DIまで幅広く出題します。',
    mc: [
      // VE × 5
      { q: 'string s = null; int len = s?.Length ?? 0; でsがnullのときlenの値は？', opts: ['A. null', 'B. -1', 'C. 0', 'D. 例外発生'], ans: 'C', diff: 'VE' },
      { q: 'C#で変数の型を暗黙的に推論するキーワードは？', opts: ['A. let', 'B. var', 'C. auto', 'D. dynamic'], ans: 'B', diff: 'VE' },
      { q: 'LINQで配列から偶数のみを取得するメソッドは？', opts: ['A. Filter()', 'B. Select()', 'C. Find()', 'D. Where()'], ans: 'D', diff: 'VE' },
      { q: 'C#で継承を禁止するキーワードは？', opts: ['A. sealed', 'B. static', 'C. abstract', 'D. readonly'], ans: 'A', diff: 'VE' },
      { q: 'async メソッドの戻り値の型として最も一般的なものは？', opts: ['A. Task または Task<T>', 'B. void のみ', 'C. Promise', 'D. Future'], ans: 'A', diff: 'VE' },
      // EM × 8
      { q: 'IDisposable を実装するクラスを using ブロックで使う理由は？', opts: ['A. 型チェックのため', 'B. 抽象化のため', 'C. ブロック終了時に Dispose() が自動で呼ばれリソースが解放される', 'D. インターフェースのみで使用可能になる'], ans: 'C', diff: 'EM' },
      { q: 'const と readonly の違いは？', opts: ['A. 同じ', 'B. constはコンパイル時定数、readonlyはコンストラクタで設定可能な実行時定数', 'C. readonlyはメソッド内でのみ使える', 'D. constはクラスフィールドのみ'], ans: 'B', diff: 'EM' },
      { q: 'struct と class の最大の違いは？', opts: ['A. メソッドを持てない', 'B. 継承できない', 'C. structは値型でスタックに、classは参照型でヒープに確保される', 'D. 速度が同じ'], ans: 'C', diff: 'EM' },
      { q: 'Nullable<T>（T?）の用途は？', opts: ['A. 参照型をnull不可にする', 'B. 型変換を行う', 'C. デフォルト値を設定する', 'D. 値型にnullを代入可能にする'], ans: 'D', diff: 'EM' },
      { q: 'Func<> / Action<> と delegate の関係は？', opts: ['A. 無関係', 'B. FuncとActionはdelegateの定義済みジェネリック型', 'C. Funcはイベント専用', 'D. delegateは廃止された'], ans: 'B', diff: 'EM' },
      { q: 'LINQの Select と Where の違いは？', opts: ['A. 同じ', 'B. Whereは変換、Selectは絞り込み', 'C. Selectは変換（射影）、Whereは絞り込み（フィルタ）', 'D. どちらもフィルタリング'], ans: 'C', diff: 'EM' },
      { q: 'C#のイベントとデリゲートの関係は？', opts: ['A. イベントはdelegateを使って実装され外部からの直接呼び出しを制限する', 'B. 無関係', 'C. イベントはinterfaceで定義される', 'D. delegateはイベントの一種'], ans: 'A', diff: 'EM' },
      { q: 'Task.WhenAll の動作は？', opts: ['A. 最初のタスクが完了した時点で返る', 'B. タスクを順次実行する', 'C. すべてのタスクが完了するまで待つ（並列実行）', 'D. 例外は無視される'], ans: 'C', diff: 'EM' },
      // H × 4
      { q: 'CancellationToken の用途は？', opts: ['A. スレッドの優先順位を設定する', 'B. タスクのタイムアウトを自動設定する', 'C. メモリを解放する', 'D. 非同期処理に対してキャンセル信号を伝える'], ans: 'D', diff: 'H' },
      { q: 'IEnumerable<T> と IQueryable<T> の違いは？', opts: ['A. 同じ', 'B. IQueryableはメモリ内処理のみ', 'C. IQueryableは式ツリーを使いDBクエリ変換が可能、IEnumerableはメモリ内処理', 'D. IEnumerableはLINQ非対応'], ans: 'C', diff: 'H' },
      { q: 'C#の record 型の特徴は？', opts: ['A. classと同じ', 'B. デフォルトで値ベースの等値比較とImmutableな設計が可能', 'C. structと同じ', 'D. 継承不可'], ans: 'B', diff: 'H' },
      { q: 'Span<T> を使う主な目的は？', opts: ['A. null安全のため', 'B. スレッド安全のため', 'C. ヒープ割り当てなしでメモリ領域を安全にスライスしパフォーマンスを改善する', 'D. 非同期処理の最適化'], ans: 'C', diff: 'H' },
      // VH × 3
      { q: 'ソースジェネレーター（Source Generator）の用途は？', opts: ['A. コンパイル時にコードを自動生成してリフレクションを避ける', 'B. ランタイム時のコード生成', 'C. テストの自動生成', 'D. NuGetパッケージの生成'], ans: 'A', diff: 'VH' },
      { q: 'System.Threading.Channels の用途は？', opts: ['A. マルチスレッドのロック', 'B. HTTPリクエストの処理', 'C. スレッド間でデータを安全に受け渡すための非同期パイプライン', 'D. ファイルI/Oの最適化'], ans: 'C', diff: 'VH' },
      { q: 'NativeAOT（.NET 7+）の主な利点は？', opts: ['A. 起動時間の短縮とメモリ使用量の削減（事前コンパイル）', 'B. デバッグしやすい', 'C. コードが読みやすくなる', 'D. ランタイムが不要になる'], ans: 'A', diff: 'VH' },
    ],
    essay: [
      { q: 'async/awaitパターンでデッドロックが発生するケースと防止策を説明してください。', keywords: ['deadlock', 'configureawait', '同期', 'コンテキスト', 'async'] },
      { q: 'DIコンテナの3つのライフタイム（Singleton/Scoped/Transient）の違いを説明してください。', keywords: ['singleton', 'scoped', 'transient', 'di', 'ライフタイム'] },
      { q: 'EF CoreでのN+1問題とInclude()を使った対策を説明してください。', keywords: ['n+1', 'include', 'eager', 'lazy', 'ef'] },
      { q: 'C#のrecordとclassの使い分けを説明してください。', keywords: ['record', 'class', '値', '不変', 'immutable', 'equal'] },
      { q: 'IEnumerable<T>とIQueryable<T>の使い分けとパフォーマンスの違いを説明してください。', keywords: ['ienumerable', 'iqueryable', 'メモリ', 'db', 'linq'] },
      { q: 'C#のメモリ管理（GCとIDisposable）のベストプラクティスを説明してください。', keywords: ['gc', 'dispose', 'using', 'finalize', 'リソース'] },
      { q: 'ASP.NET CoreにおけるミドルウェアパイプラインとDIの仕組みを説明してください。', keywords: ['middleware', 'pipeline', 'di', 'inject', 'configure'] },
      { q: 'C#のパターンマッチング（switch式、isパターン）の活用例を説明してください。', keywords: ['switch', 'pattern', 'is', 'match', 'type'] },
      { q: 'Channel<T>を使ったプロデューサ/コンシューマパターンの実装を説明してください。', keywords: ['channel', 'producer', 'consumer', '非同期', 'pipeline'] },
      { q: 'BenchmarkDotNetを使ったパフォーマンス計測を説明してください。', keywords: ['benchmark', 'dotnet', '計測', 'パフォーマンス', 'メモリ'] },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // Android
  // ──────────────────────────────────────────────────────────
  android: {
    title: 'Android テスト（選択式20問 + 記述式10問）',
    intro: 'Androidのライフサイクル・JetpackからパフォーマンスとKotlinコルーチンまで出題します。',
    mc: [
      // VE × 5
      { q: 'Androidのライフサイクルで最初に呼ばれるメソッドは？', opts: ['A. onStart()', 'B. onResume()', 'C. onCreate()', 'D. onAttach()'], ans: 'C', diff: 'VE' },
      { q: 'AndroidのUI更新は必ずどのスレッドで行う必要があるか？', opts: ['A. メインスレッド（UIスレッド）', 'B. バックグラウンドスレッド', 'C. どのスレッドでも可', 'D. WorkManagerスレッド'], ans: 'A', diff: 'VE' },
      { q: 'AndroidでSQLiteの代わりに推奨される永続化ライブラリは？', opts: ['A. Realm', 'B. GreenDAO', 'C. Room', 'D. SQLDelight'], ans: 'C', diff: 'VE' },
      { q: 'AndroidのViewModelの主な目的は？', opts: ['A. UIを直接描画する', 'B. UIデータをライフサイクルを超えて保持する', 'C. データベースに接続する', 'D. ネットワーク通信を行う'], ans: 'B', diff: 'VE' },
      { q: 'RecyclerViewのアダプタで必ず実装するメソッドに含まれないものは？', opts: ['A. onCreateViewHolder()', 'B. onBindViewHolder()', 'C. getItemCount()', 'D. onItemClick()'], ans: 'D', diff: 'VE' },
      // EM × 8
      { q: 'LiveData と StateFlow の違いは？', opts: ['A. 同じ', 'B. LiveDataの方が新しい', 'C. StateFlowはUIでは使えない', 'D. StateFlowはKotlin Coroutinesベースで初期値が必須、LiveDataはAndroidライフサイクルに統合'], ans: 'D', diff: 'EM' },
      { q: 'Hiltの @Singleton スコープは何を保証するか？', opts: ['A. スレッドセーフ', 'B. アプリ全体で1つのインスタンスを共有する', 'C. テスト時のみ有効', 'D. UIスレッドで実行する'], ans: 'B', diff: 'EM' },
      { q: 'WorkManager が AlarmManager より適切なのはどのような場合か？', opts: ['A. アプリが終了しても確実に実行される保証が必要なバックグラウンドタスク', 'B. UIアニメーション', 'C. リアルタイム通信', 'D. 即時ファイル圧縮'], ans: 'A', diff: 'EM' },
      { q: 'Android 12以降でBluetooth権限が分離された主な理由は？', opts: ['A. パフォーマンス', 'B. APIの単純化', 'C. 省電力', 'D. 位置情報アクセスとスキャンを分離してプライバシーを強化するため'], ans: 'D', diff: 'EM' },
      { q: 'DiffUtil をRecyclerViewで使う利点は？', opts: ['A. ソートが高速になる', 'B. データベース同期が自動になる', 'C. アダプタが不要になる', 'D. 変更箇所のみ差分更新することでアニメーションとパフォーマンスを向上させる'], ans: 'D', diff: 'EM' },
      { q: 'ViewBinding と DataBinding の主な違いは？', opts: ['A. DataBindingはレイアウトからViewModelのデータを直接バインドできる', 'B. 同じ', 'C. ViewBindingはXML書き換えが必要', 'D. DataBindingは廃止された'], ans: 'A', diff: 'EM' },
      { q: 'メモリリーク検出ツールとして代表的なライブラリは？', opts: ['A. Timber', 'B. LeakCanary', 'C. Retrofit', 'D. Glide'], ans: 'B', diff: 'EM' },
      { q: 'Jetpack Composeの再コンポーズを最小化するベストプラクティスは？', opts: ['A. すべての状態をActivityに持つ', 'B. remember()を使わない', 'C. 状態のスコープを狭め、安定した型をComposableに渡す', 'D. 全ComposableをObjectにする'], ans: 'C', diff: 'EM' },
      // H × 4
      { q: 'Android ARTとDalvikの主な違いは？', opts: ['A. ARTはインストール時にAOTコンパイルを行い実行時パフォーマンスを向上させる', 'B. DalvikがARTより速い', 'C. ARTはJITのみ', 'D. DalvikはAndroid 9以降のデフォルト'], ans: 'A', diff: 'H' },
      { q: 'ProGuard/R8 の主な役割は？', opts: ['A. テストの自動化', 'B. ビルド高速化', 'C. コードの難読化・縮小化・最適化によるAPKサイズ削減', 'D. Lintチェック'], ans: 'C', diff: 'H' },
      { q: 'coroutineScope と supervisorScope の違いは？', opts: ['A. 同じ', 'B. supervisorScopeは子コルーチンの失敗が他の子に伝播しない', 'C. coroutineScopeは失敗を無視する', 'D. supervisorScopeはUIスレッドのみ'], ans: 'B', diff: 'H' },
      { q: 'DataStore が SharedPreferences より優れる理由は？', opts: ['A. 暗号化が自動', 'B. ネットワーク同期が可能', 'C. SQLiteより速い', 'D. 非同期でタイプセーフなデータ永続化が可能'], ans: 'D', diff: 'H' },
      // VH × 3
      { q: 'Paging 3 ライブラリが解決する問題は？', opts: ['A. 画像のキャッシュ', 'B. ネットワーク認証', 'C. 大量データを段階的にロードしメモリとネットワーク効率を最適化する', 'D. テストの自動化'], ans: 'C', diff: 'VH' },
      { q: 'Choreographer の役割は？', opts: ['A. アニメーションライブラリ', 'B. VSync信号に同期してUI描画をスケジューリングする', 'C. スレッドプールを管理する', 'D. Viewのレイアウト計算を行う'], ans: 'B', diff: 'VH' },
      { q: 'StrictMode を使う目的は？', opts: ['A. メインスレッドでのDiskやNetworkアクセスなどの問題を開発時に検出する', 'B. 本番環境のパフォーマンス監視', 'C. 難読化の検証', 'D. テストの並列実行'], ans: 'A', diff: 'VH' },
    ],
    essay: [
      { q: 'Androidのライフサイクル（onCreate〜onDestroy）を説明し、ViewModelとの連携方法を述べてください。', keywords: ['ライフサイクル', 'oncreate', 'ondestroy', 'viewmodel', '回転'] },
      { q: 'Jetpack ComposeとXMLレイアウトの使い分けを説明してください。', keywords: ['compose', 'xml', '宣言', '再コンポーズ', 'viewbinding'] },
      { q: 'Kotlinコルーチンの構造化された同時実行（Structured Concurrency）を説明してください。', keywords: ['coroutine', 'scope', 'structured', 'cancel', 'job'] },
      { q: 'Androidのバックグラウンド処理制限とWorkManagerを使った対策を説明してください。', keywords: ['workmanager', 'background', 'doze', 'batterysaver', '制限'] },
      { q: 'Androidのメモリリークを防ぐための実装上の注意点を説明してください。', keywords: ['メモリリーク', '参照', 'weakreference', 'leakcanary', 'context'] },
      { q: 'RecyclerViewのパフォーマンスチューニング（DiffUtil、ViewHolder）を説明してください。', keywords: ['recyclerview', 'viewholder', 'diffutil', 'recycle', 'パフォーマンス'] },
      { q: 'AndroidのNetworkセキュリティ（SSL Pinning）を説明してください。', keywords: ['ssl', 'pinning', '証明書', 'https', 'mitm'] },
      { q: 'HiltによるMVVMアーキテクチャの設計を説明してください。', keywords: ['hilt', 'mvvm', 'inject', 'viewmodel', 'repository'] },
      { q: 'Android Profilerを使ったパフォーマンス問題の特定方法を説明してください。', keywords: ['profiler', 'memory', 'cpu', 'ヒープダンプ', 'frame'] },
      { q: 'Google Play Store公開時のセキュリティとリリース準備（署名・ProGuard）を説明してください。', keywords: ['署名', 'keystore', 'proguard', 'r8', 'release'] },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // Swift
  // ──────────────────────────────────────────────────────────
  swift: {
    title: 'Swift テスト（選択式20問 + 記述式10問）',
    intro: 'SwiftのOptional・ARC・Concurrencyから高度なジェネリクスまで出題します。',
    mc: [
      // VE × 5
      { q: 'Swiftで再代入可能な変数を宣言するキーワードは？', opts: ['A. var', 'B. let', 'C. const', 'D. mut'], ans: 'A', diff: 'VE' },
      { q: 'Swiftで安全にOptionalをアンラップする方法は？', opts: ['A. ! (強制アンラップ)', 'B. if let または guard let', 'C. unwrap()', 'D. optional()'], ans: 'B', diff: 'VE' },
      { q: 'Swift配列に要素を追加するメソッドは？', opts: ['A. push()', 'B. add()', 'C. append()', 'D. insert()のみ'], ans: 'C', diff: 'VE' },
      { q: 'print(5 / 2) の出力は？', opts: ['A. 2', 'B. 2.5', 'C. 2.0', 'D. コンパイルエラー'], ans: 'A', diff: 'VE' },
      { q: 'guard let x = optVal else { return } の役割は？', opts: ['A. 値が存在するときreturnする', 'B. 常にreturnする', 'C. nilの場合にreturnし以降ではアンラップされた値を使える', 'D. 値をnilに設定する'], ans: 'C', diff: 'VE' },
      // EM × 8
      { q: 'SwiftのARCにおいて循環参照を防ぐ方法は？', opts: ['A. weak または unowned を使う', 'B. deinit()を明示的に呼ぶ', 'C. クロージャを使わない', 'D. strong参照を増やす'], ans: 'A', diff: 'EM' },
      { q: 'struct と class の主な違いは？', opts: ['A. structは継承可能', 'B. structは値型（コピー）、classは参照型', 'C. classはメソッドを持てない', 'D. 違いはない'], ans: 'B', diff: 'EM' },
      { q: 'SwiftのProtocolの役割は？', opts: ['A. クラスの継承のみ', 'B. 型を具体化する', 'C. 構造体専用', 'D. メソッド・プロパティの契約（インターフェース）を定義する'], ans: 'D', diff: 'EM' },
      { q: 'enumにAssociated Valueを使う用途は？', opts: ['A. 列挙型の整数値', 'B. クラスの代替', 'C. 各ケースに異なる型の値を関連付けて多様な状態を表現する', 'D. エラー処理のみ'], ans: 'C', diff: 'EM' },
      { q: 'Codable プロトコルの用途は？', opts: ['A. JSON等のデータ形式へのencode/decodeを簡単に実装する', 'B. ファイルI/O', 'C. ネットワーク通信', 'D. データベース保存'], ans: 'A', diff: 'EM' },
      { q: 'Swiftでエラーを扱う際に使うキーワードの組み合わせは？', opts: ['A. if let', 'B. guard let', 'C. switch', 'D. do-try-catch'], ans: 'D', diff: 'EM' },
      { q: '@escaping クロージャとは？', opts: ['A. 同期処理に使う', 'B. 関数のスコープを超えて生存するクロージャ（非同期処理などで保存される場合）', 'C. クロージャを解放する', 'D. エラーを無視する'], ans: 'B', diff: 'EM' },
      { q: 'lazy プロパティの特徴は？', opts: ['A. 常にnilを返す', 'B. 定数のみに使える', 'C. 最初にアクセスされるまで初期化を遅延させる', 'D. スレッドセーフを保証する'], ans: 'C', diff: 'EM' },
      // H × 4
      { q: 'Swift の actor の目的は？', opts: ['A. クロージャのキャプチャ制御', 'B. データ競合を防ぐためにstate内部へのアクセスを直列化する', 'C. プロトコル拡張', 'D. 値型の共有'], ans: 'B', diff: 'H' },
      { q: '@MainActor アノテーションの役割は？', opts: ['A. UIを非同期に更新する', 'B. バックグラウンドスレッドへ処理を移す', 'C. メインスレッドでのみ実行されることを保証する', 'D. Actorの同期を無効化する'], ans: 'C', diff: 'H' },
      { q: '@resultBuilder の主な用途は？', opts: ['A. エラー処理', 'B. DSL（ドメイン固有言語）的な宣言的コードを書けるようにする', 'C. 型変換', 'D. データのシリアライズ'], ans: 'B', diff: 'H' },
      { q: 'withTaskGroup の用途は？', opts: ['A. 複数の非同期タスクを並列実行し結果を収集する', 'B. キャンセル信号を送る', 'C. デッドロックを防止する', 'D. メインスレッドに切り替える'], ans: 'A', diff: 'H' },
      // VH × 3
      { q: '@propertyWrapper の用途は？', opts: ['A. プロパティの型を変更する', 'B. プロパティのget/setに共通ロジックを付与する（バリデーション等）', 'C. 定数を動的にする', 'D. データバインディング'], ans: 'B', diff: 'VH' },
      { q: 'Existential Type（any Protocol）とOpaque Type（some Protocol）の違いは？', opts: ['A. 同じ', 'B. anyの方が高速', 'C. someはより多くの型に対応', 'D. someはコンパイル時に具体的な型が確定するためanyより効率的'], ans: 'D', diff: 'VH' },
      { q: '@inlinable と @usableFromInline の目的は？', opts: ['A. モジュールをまたいだ関数のインライン最適化を可能にする', 'B. メモリ割り当てを最適化する', 'C. テスト可視性を制御する', 'D. ジェネリクスを特化する'], ans: 'A', diff: 'VH' },
    ],
    essay: [
      { q: 'SwiftのARCと参照カウントの仕組み、循環参照の対策を説明してください。', keywords: ['arc', '参照カウント', 'weak', 'unowned', '循環'] },
      { q: 'Protocol-Oriented Programming（POP）とクラス継承の使い分けを説明してください。', keywords: ['protocol', 'pop', '継承', '拡張', 'extension'] },
      { q: 'SwiftUIのStateとBindingの使い分けを説明してください。', keywords: ['state', 'binding', 'swiftui', '状態', 'view'] },
      { q: 'Swiftのasync/awaitとCombineの使い分けを説明してください。', keywords: ['async', 'await', 'combine', '非同期', 'publisher'] },
      { q: 'Swiftのエラーハンドリング（do-try-catch・Result型）のベストプラクティスを説明してください。', keywords: ['try', 'catch', 'result', 'error', '例外'] },
      { q: 'Xcode Instrumentsを使ったメモリリークとCPU使用率の調査方法を説明してください。', keywords: ['instruments', 'memory', 'cpu', 'leak', 'profiling'] },
      { q: 'Swift Package Manager（SPM）とCocoaPodsの違いと使い分けを説明してください。', keywords: ['spm', 'cocoapods', '依存', 'package', '管理'] },
      { q: 'SwiftのActorを使ったスレッドセーフな設計を説明してください。', keywords: ['actor', 'thread', 'safe', 'concurrency', 'data race'] },
      { q: 'App Store申請前に確認すべきセキュリティとパフォーマンスのチェック項目を説明してください。', keywords: ['appstore', 'セキュリティ', 'パフォーマンス', 'review', '審査'] },
      { q: 'SwiftのGenericsとAssociated Typeを使ったプロトコル設計の利点を説明してください。', keywords: ['generics', 'associated', 'type', 'protocol', '汎用'] },
    ],
  },
};

module.exports = { LANG_TESTS };
