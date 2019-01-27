package ch.sysout.emubro.ui;

import java.awt.AWTException;
import java.awt.BorderLayout;
import java.awt.KeyEventDispatcher;
import java.awt.KeyboardFocusManager;
import java.awt.Rectangle;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.DataFlavor;
import java.awt.datatransfer.Transferable;
import java.awt.datatransfer.UnsupportedFlavorException;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

import javax.imageio.ImageIO;
import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.SwingUtilities;
import javax.swing.Timer;
import javax.swing.WindowConstants;

public class PrintScreenDetector extends JFrame {
	private static final long serialVersionUID = 1L;

	private int checkForImageIntervalInSeconds = 5000;

	private AbstractButton btnPrintScreen = new JButton("Print Screen");
	private JLabel lblResponse = new JLabel("Awaiting printscreen...");
	private AutoScaleImagePanel pnlAutoScaleImage = new AutoScaleImagePanel();
	private BufferedImage lastImage;

	private Robot robot;

	private Clipboard clipboard;

	private Transferable emptyTransferable = new Transferable() {
		@Override
		public DataFlavor[] getTransferDataFlavors() {
			return new DataFlavor[0];
		}

		@Override
		public boolean isDataFlavorSupported(DataFlavor flavor) {
			return false;
		}

		@Override
		public Object getTransferData(DataFlavor flavor) throws UnsupportedFlavorException {
			throw new UnsupportedFlavorException(flavor);
		}
	};

	private Timer timer;

	public PrintScreenDetector() throws AWTException {
		super("PrintScreen-Detector");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		initRobot();
		initComponents();
		createUI();
		pack();
	}

	private void initComponents() {
		KeyEventDispatcher keyEventDispatcher = new KeyEventDispatcher() {
			@Override
			public boolean dispatchKeyEvent(final KeyEvent e) {
				if (e.getID() == KeyEvent.KEY_RELEASED) {
					if (e.getKeyCode() == KeyEvent.VK_PRINTSCREEN) {
						try {
							checkForImageInClipboard();
							lblResponse.setText("Screenshot taken via Keyboard");
						} catch (Exception e1) {
							if (e1 instanceof IllegalStateException) {
								System.err.println("IllegalStateException occured. maybe there are multiple attempts accessing the clipboard,"
										+ "or your computer was in standby." + e1.getMessage());
							} else {
								// TODO Auto-generated catch block
								e1.printStackTrace();
							}
							clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
						}
					}
				}
				return false;
			}
		};
		KeyboardFocusManager.getCurrentKeyboardFocusManager().addKeyEventDispatcher(keyEventDispatcher);
	}

	protected void checkForImageInClipboard() throws Exception {
		BufferedImage img = getImageFromClipboard();
		if (img != null) {
			clipboard.setContents(emptyTransferable, null);
			if (lastImage == null || clipBoardImageChanged(img, lastImage)) {
				System.out.println(lastImage == null ? "new clipboard image found" : "clipboard image has changed...");
				try {
					writeImage(img);
					lastImage = img;
					lblResponse.setText("Screenshot found in clipboard and saved");
				} catch (IOException e1) {
					lblResponse.setText("Error while saving screenshot from clipboard");
					e1.printStackTrace();
				}
			} else {
				System.out.println("still same image in clipboard");
			}
		} else {
			lblResponse.setText("Awaiting printscreen...");
		}
	}

	private void createUI() {
		setLayout(new BorderLayout(10, 10));
		getRootPane().setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
		btnPrintScreen.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				int currentState = getExtendedState();
				setExtendedState(JFrame.ICONIFIED);
				doPrintScreen();
				setExtendedState(currentState);
				lblResponse.setText("Screenshot taken via Button");
			}
		});
		add(lblResponse, BorderLayout.NORTH);
		add(pnlAutoScaleImage, BorderLayout.CENTER);
		add(btnPrintScreen, BorderLayout.SOUTH);
	}

	private void doPrintScreen() {
		Rectangle screenRect = new Rectangle(Toolkit.getDefaultToolkit().getScreenSize());
		BufferedImage capture = robot.createScreenCapture(screenRect);
		try {
			writeImage(capture);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	private void writeImage(BufferedImage capture) throws IOException {
		File file = new File("screenshots/" + System.currentTimeMillis() + ".jpg");
		file.mkdirs();
		ImageIO.write(capture, "jpg", file);
		SwingUtilities.invokeLater(new Runnable() {

			@Override
			public void run() {
				pnlAutoScaleImage.setGameCover(capture);
			}
		});
	}

	private void initRobot() throws AWTException {
		if (robot == null) {
			robot = new Robot();
		}
	}

	public BufferedImage getImageFromClipboard() throws Exception {
		Transferable transferable;
		try {
			transferable = clipboard.getContents(null);
		} catch (IllegalStateException e) {
			throw e;
		}
		if (transferable != null && transferable.isDataFlavorSupported(DataFlavor.imageFlavor)) {
			try {
				return (BufferedImage) transferable.getTransferData(DataFlavor.imageFlavor);
			} catch (UnsupportedFlavorException e) {
				e.printStackTrace();
			} catch (IOException e) {
				e.printStackTrace();
			}
		} else {
			System.out.println("no image found");
		}
		return null;
	}

	private boolean clipBoardImageChanged(BufferedImage imgA, BufferedImage imgB) {
		// The images must be the same size.
		if (imgA.getWidth() != imgB.getWidth() || imgA.getHeight() != imgB.getHeight()) {
			return true;
		}

		int width = imgA.getWidth();
		int height = imgA.getHeight();

		// Loop over every pixel.
		for (int y = 0; y < height; y++) {
			for (int x = 0; x < width; x++) {
				// Compare the pixels for equality.
				if (imgA.getRGB(x, y) != imgB.getRGB(x, y)) {
					return true;
				}
			}
		}
		return false;
	}


	public void startCapture() {
		if (timer != null && timer.isRunning()) {
			throw new IllegalStateException("timer is running. stop it first");
		}
		if (clipboard == null) {
			clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
		}
		if (timer == null) {
			timer = new Timer(checkForImageIntervalInSeconds, new ActionListener() {

				@Override
				public void actionPerformed(ActionEvent e) {
					try {
						checkForImageInClipboard();
					} catch (Exception e1) {
						if (e1 instanceof IllegalStateException) {
							System.err.println("IllegalStateException occured. maybe there are multiple attempts accessing the clipboard,"
									+ "or your computer was in standby." + e1.getMessage());
						} else {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
						clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
					}
				}
			});
			timer.setCoalesce(true);
			timer.setRepeats(true);
			timer.setInitialDelay(0);
		}
		timer.start();
	}

	public void stopCapture() {
		if (timer == null || !timer.isRunning()) {
			throw new IllegalStateException("timer is not running");
		}
		timer.stop();
	}
}