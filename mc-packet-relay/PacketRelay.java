import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 自作Minecraftサーバーとの通信テスト用の、依存関係なしのTCP中継ツール。
 *
 * MinecraftクライアントはこのツールのポートにTCP接続し(サーバーアドレスを
 * localhost:<listenPort> に設定する)、このツールが本来のサーバーへ
 * バイト列をそのまま中継する。標準入力からのコマンドで、
 * クライアント→サーバー方向の送信を「停止」または「遅延」させられる。
 *
 * MinecraftのMOD(Fabric/Forge)ではなく、単体で動くJavaプログラムのため、
 * Minecraft本体やバージョンに依存せず、追加ライブラリも不要でそのまま実行できる。
 */
public final class PacketRelay {

	private enum Mode {
		NORMAL,
		STOP,
		DELAY
	}

	private static volatile Mode mode = Mode.NORMAL;
	private static volatile long delayMillis = 500L;

	public static void main(String[] args) throws IOException {
		// 実行環境の既定文字コードに関わらず、日本語メッセージが文字化けしないようにする
		System.setOut(new PrintStream(System.out, true, StandardCharsets.UTF_8));
		System.setErr(new PrintStream(System.err, true, StandardCharsets.UTF_8));

		int listenPort = 25566;
		String targetHost = "localhost";
		int targetPort = 25565;

		if (args.length >= 1) {
			listenPort = Integer.parseInt(args[0]);
		}
		if (args.length >= 2) {
			targetHost = args[1];
		}
		if (args.length >= 3) {
			targetPort = Integer.parseInt(args[2]);
		}

		System.out.println("=== Minecraft Packet Relay (通信テスト用) ===");
		System.out.println("待受ポート: " + listenPort + "  ->  転送先: " + targetHost + ":" + targetPort);
		System.out.println("Minecraftのマルチプレイ画面で、サーバーアドレスを");
		System.out.println("    localhost:" + listenPort);
		System.out.println("に設定して接続してください。");
		printHelp();

		String finalTargetHost = targetHost;
		int finalTargetPort = targetPort;

		Thread consoleThread = new Thread(PacketRelay::consoleLoop, "console");
		consoleThread.setDaemon(true);
		consoleThread.start();

		try (ServerSocket serverSocket = new ServerSocket(listenPort)) {
			while (true) {
				Socket client = serverSocket.accept();
				System.out.println("[接続] クライアント " + client.getRemoteSocketAddress() + " が接続しました");
				Thread t = new Thread(() -> handleConnection(client, finalTargetHost, finalTargetPort));
				t.start();
			}
		}
	}

	private static void printHelp() {
		System.out.println("コマンド: stop | delay <ms> | normal | status | help | quit");
	}

	private static void consoleLoop() {
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
			String line;
			while ((line = reader.readLine()) != null) {
				handleCommand(line.trim());
			}
		} catch (IOException ignored) {
			// コンソールが閉じられた場合は何もしない
		}
	}

	private static void handleCommand(String line) {
		if (line.isEmpty()) {
			return;
		}
		String[] parts = line.split("\\s+");
		String cmd = parts[0].toLowerCase(Locale.ROOT);
		switch (cmd) {
			case "stop" -> {
				mode = (mode == Mode.STOP) ? Mode.NORMAL : Mode.STOP;
				printStatus();
			}
			case "delay" -> {
				if (parts.length >= 2) {
					try {
						delayMillis = Math.max(0L, Long.parseLong(parts[1]));
					} catch (NumberFormatException e) {
						System.out.println("使い方: delay <ミリ秒>");
						return;
					}
				}
				mode = (mode == Mode.DELAY) ? Mode.NORMAL : Mode.DELAY;
				printStatus();
			}
			case "normal" -> {
				mode = Mode.NORMAL;
				printStatus();
			}
			case "status" -> printStatus();
			case "help" -> printHelp();
			case "quit", "exit" -> {
				System.out.println("終了します");
				System.exit(0);
			}
			default -> System.out.println("不明なコマンド: " + cmd + " (help でコマンド一覧)");
		}
	}

	private static void printStatus() {
		String s = switch (mode) {
			case NORMAL -> "通常送信中";
			case STOP -> "送信停止(STOP)中";
			case DELAY -> "送信遅延(DELAY " + delayMillis + "ms)中";
		};
		System.out.println("[状態] " + s);
	}

	private static void handleConnection(Socket client, String targetHost, int targetPort) {
		Socket server;
		try {
			server = new Socket(targetHost, targetPort);
		} catch (IOException e) {
			System.out.println("[エラー] " + targetHost + ":" + targetPort + " へ接続できません: " + e.getMessage());
			closeQuietly(client);
			return;
		}

		try {
			client.setTcpNoDelay(true);
			server.setTcpNoDelay(true);

			Socket finalServer = server;
			Thread c2s = new Thread(() -> pumpClientToServer(client, finalServer), "c2s");
			Thread s2c = new Thread(() -> pumpDirect(finalServer, client), "s2c");
			c2s.start();
			s2c.start();
			c2s.join();
			s2c.join();
		} catch (IOException e) {
			System.out.println("[エラー] 通信中に問題が発生しました: " + e.getMessage());
		} catch (InterruptedException ignored) {
			Thread.currentThread().interrupt();
		} finally {
			closeQuietly(client);
			closeQuietly(server);
			System.out.println("[切断] コネクションを終了しました");
		}
	}

	/** サーバー→クライアント方向は常にそのまま中継する(操作対象はクライアント→サーバーのみ)。 */
	private static void pumpDirect(Socket from, Socket to) {
		try {
			InputStream in = from.getInputStream();
			OutputStream out = to.getOutputStream();
			byte[] buf = new byte[8192];
			int n;
			while ((n = in.read(buf)) != -1) {
				out.write(buf, 0, n);
				out.flush();
			}
		} catch (IOException ignored) {
			// 接続断
		} finally {
			closeQuietly(from);
			closeQuietly(to);
		}
	}

	/** クライアント→サーバー方向は、モードに応じて通常送信/破棄/遅延を切り替える。 */
	private static void pumpClientToServer(Socket client, Socket server) {
		BlockingQueue<DelayedChunk> queue = new LinkedBlockingQueue<>();
		AtomicBoolean readerAlive = new AtomicBoolean(true);

		Thread flusher = new Thread(() -> {
			try {
				OutputStream out = server.getOutputStream();
				while (readerAlive.get() || !queue.isEmpty()) {
					DelayedChunk dc = queue.poll(50, TimeUnit.MILLISECONDS);
					if (dc == null) {
						continue;
					}
					long wait = dc.sendAtMillis - System.currentTimeMillis();
					if (wait > 0) {
						Thread.sleep(wait);
					}
					out.write(dc.data, 0, dc.length);
					out.flush();
				}
			} catch (IOException | InterruptedException ignored) {
				// 接続断
			}
		}, "delay-flusher");
		flusher.setDaemon(true);
		flusher.start();

		try {
			InputStream in = client.getInputStream();
			byte[] buf = new byte[8192];
			int n;
			while ((n = in.read(buf)) != -1) {
				Mode currentMode = mode;
				if (currentMode == Mode.STOP) {
					continue; // 破棄(送信停止)
				}
				byte[] chunk = Arrays.copyOf(buf, n);
				long sendAt = (currentMode == Mode.DELAY)
						? System.currentTimeMillis() + delayMillis
						: System.currentTimeMillis();
				queue.add(new DelayedChunk(chunk, n, sendAt));
			}
		} catch (IOException ignored) {
			// 接続断
		} finally {
			readerAlive.set(false);
		}
	}

	private static void closeQuietly(Socket s) {
		if (s == null) {
			return;
		}
		try {
			s.close();
		} catch (IOException ignored) {
			// no-op
		}
	}

	private static final class DelayedChunk {
		final byte[] data;
		final int length;
		final long sendAtMillis;

		DelayedChunk(byte[] data, int length, long sendAtMillis) {
			this.data = data;
			this.length = length;
			this.sendAtMillis = sendAtMillis;
		}
	}
}
