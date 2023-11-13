package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Cursor;
import java.awt.Desktop;
import java.awt.Dimension;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JDialog;
import javax.swing.JPanel;
import javax.swing.JTextPane;
import javax.swing.text.JTextComponent;
import javax.swing.text.SimpleAttributeSet;
import javax.swing.text.StyleConstants;
import javax.swing.text.StyledDocument;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class AboutDialog extends JDialog implements ActionListener {
	private static final long serialVersionUID = 1L;

	private AbstractButton btnLogo = new JButton(ImageUtil.getFlatSVGIconFrom(Icons.get("applicationIcon"), 96, ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR)));

	private JTextPane lblHeader = new JTextPane();
	private JTextPane txtDescription = new JTextPane();
	private JTextPane lblCopyright = new JTextPane();
	private JLinkButton lnkWebsite = new JLinkButton();

	int size = ScreenSizeUtil.is3k() ? 32 : 24;
	private JButton btnFacebook = new JButton(ImageUtil.getFlatSVGIconFrom(Icons.get("facebook"), size, Color.LIGHT_GRAY));
	private JButton btnTwitter = new JButton(ImageUtil.getFlatSVGIconFrom(Icons.get("twitter"), size, Color.LIGHT_GRAY));
	private JButton btnYoutube = new JButton(ImageUtil.getFlatSVGIconFrom(Icons.get("youtube"), size, Color.LIGHT_GRAY));
	private JButton btnDiscord = new JButton(ImageUtil.getFlatSVGIconFrom(Icons.get("discord"), size, Color.LIGHT_GRAY));
	private JButton btnReddit = new JButton(ImageUtil.getFlatSVGIconFrom(Icons.get("reddit"), size, Color.LIGHT_GRAY));
	private JButton btnGitHub = new JButton(ImageUtil.getFlatSVGIconFrom(Icons.get("github"), size, Color.LIGHT_GRAY));
	private AbstractButton[] socialMediaButtons = new JButton[] { btnFacebook, btnTwitter, btnYoutube, btnDiscord, btnReddit, btnGitHub };

	private JButton btnClose = new JButton(Messages.get(MessageConstants.CLOSE));

	private String applicationVersion;

	private int fancyClickCounter;

	public AboutDialog(String applicationVersion) {
		this.applicationVersion = applicationVersion;
		setTitle(Messages.get(MessageConstants.ABOUT, Messages.get(MessageConstants.APPLICATION_TITLE)));
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
		setResizable(false);
		initComponents();
		createUI();

		//		setUndecorated(true); // remove system frame
		//		AWTUtilities.setWindowOpaque(this, false); // enable opacity
		//		SwingUtils.createDialogBackPanel(this, view.getContentPane());

		pack();
		setPreferredSize(new Dimension(50,50));
		txtDescription.setText(Messages.get(MessageConstants.APPLICATION_DESCRIPTION, Messages.get(MessageConstants.APPLICATION_TITLE)));
		setSize(new Dimension(getWidth(),
				getHeight()
				// + txtDescription.getHeight()
				// + lblHeader.getHeight()
				// + lblCopyright.getHeight()
				+ btnFacebook.getHeight() * 2));
		//		setMinimumSize(getSize());
		btnClose.requestFocusInWindow();
	}

	private List<Image> getIcons() {
		List<Image> icons = new ArrayList<>();
		String[] sizes = { "32", "24", "16" };
		for (String s : sizes) {
			icons.add(ImageUtil.getImageIconFrom(Icons.get("about", s, s)).getImage());
		}
		return icons;
	}

	private void initComponents() {
		btnLogo.setFocusable(false);
		btnLogo.setBorderPainted(false);
		btnLogo.setContentAreaFilled(false);
		setActionCommands();
		setOpaque(false, lblHeader, lblCopyright, txtDescription, lnkWebsite);
		initTexts();
		setEditable(false, lblHeader, lblCopyright, txtDescription);

		// lblHeader.setEditable(false);
		// txtDescription.setEditable(false);
		// lblCopyright.setEditable(false);
		// lnkWebsite.setEditable(false);

		StyledDocument doc = lblHeader.getStyledDocument();
		SimpleAttributeSet center = new SimpleAttributeSet();
		StyleConstants.setAlignment(center, StyleConstants.ALIGN_CENTER);
		doc.setParagraphAttributes(0, doc.getLength(), center, false);

		doc = txtDescription.getStyledDocument();
		center = new SimpleAttributeSet();
		StyleConstants.setAlignment(center, StyleConstants.ALIGN_CENTER);
		doc.setParagraphAttributes(0, doc.getLength(), center, false);

		doc = lblCopyright.getStyledDocument();
		center = new SimpleAttributeSet();
		StyleConstants.setAlignment(center, StyleConstants.ALIGN_CENTER);
		doc.setParagraphAttributes(0, doc.getLength(), center, false);

		//		doc = lnkWebsite.getStyledDocument();
		//		center = new SimpleAttributeSet();
		//		StyleConstants.setAlignment(center, StyleConstants.ALIGN_CENTER);
		//		doc.setParagraphAttributes(0, doc.getLength(), center, false);

		setToolTipTexts();
		addListeners();
	}

	private void initTexts() {
		lblHeader.setText(Messages.get(MessageConstants.APPLICATION_TITLE) + " v" + applicationVersion);
		String currentYear = Year.now().toString();
		lblCopyright.setText("\u00a9 2015 - " + currentYear + " sysout.ch");
		lnkWebsite.setText(Messages.get(MessageConstants.WEBSITE));
	}

	private void setOpaque(boolean b, JComponent... components) {
		for (JComponent c : components) {
			c.setOpaque(false);
		}
	}

	private void setEditable(boolean b, JTextComponent... components) {
		for (JTextComponent c : components) {
			c.setEditable(false);
		}
	}

	private void setActionCommands() {
		btnReddit.setActionCommand("https://reddit.com/r/emuBro");
		btnDiscord.setActionCommand("https://discord.gg/EtKvZ2F");
		btnFacebook.setActionCommand("https://www.facebook.com/emubr0");
		btnTwitter.setActionCommand("https://twitter.com/emuBro");
		btnYoutube.setActionCommand("https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q");
		btnGitHub.setActionCommand("https://github.com/sysoutch/emubro");
	}

	private void setToolTipTexts() {
		btnLogo.setToolTipText("Don't click this button! (Yes this is a button)");
		lnkWebsite.setToolTipText("Visit our fancy website, yayy!");
		btnReddit.setToolTipText("Become a Subscribro on Reddit");
		btnDiscord.setToolTipText("Chat with us in our Discord");
		btnFacebook.setToolTipText("Hate us on Facebook");
		btnTwitter.setToolTipText("Follow us on Twitter");
		btnYoutube.setToolTipText("Subscribe on YouTube");
		btnGitHub.setToolTipText("Help develop emuBro at GitHub");
	}

	private void addListeners() {
		UIUtil.installEscapeCloseOperation(this);
		addActionListeners(btnLogo, lnkWebsite, btnClose);

		ColorStore colorStore = ColorStore.current();
		colorStore.setColor("facebook", new Color(66, 103, 178));
		colorStore.setColor("twitter", new Color(29, 161, 242));
		colorStore.setColor("youtube", new Color(255, 0, 0));
		colorStore.setColor("discord", new Color(114, 137, 218));
		colorStore.setColor("reddit", new Color(255, 69, 0));
		colorStore.setColor("github", new Color(51, 51, 51));
		for (AbstractButton btn : socialMediaButtons) {
			btn.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					super.mouseEntered(e);
					int increaseIconSizeValue = 0;
					if (btn == btnFacebook) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("facebook"), size+increaseIconSizeValue, colorStore.getColor("facebook")));
					} else if (btn == btnTwitter) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("twitter"), size+increaseIconSizeValue, colorStore.getColor("twitter")));
					} else if (btn == btnYoutube) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("youtube"), size+increaseIconSizeValue, colorStore.getColor("youtube")));
					} else if (btn == btnDiscord) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("discord"), size+increaseIconSizeValue, colorStore.getColor("discord")));
					} else if (btn == btnReddit) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("reddit"), size+increaseIconSizeValue, colorStore.getColor("reddit")));
					} else if (btn == btnGitHub) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("github"), size+increaseIconSizeValue, colorStore.getColor("github")));
					}
				}

				@Override
				public void mouseExited(MouseEvent e) {
					super.mouseExited(e);
					if (btn == btnFacebook) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("facebook"), size, Color.LIGHT_GRAY));
					} else if (btn == btnTwitter) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("twitter"), size, Color.LIGHT_GRAY));
					} else if (btn == btnYoutube) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("youtube"), size, Color.LIGHT_GRAY));
					} else if (btn == btnDiscord) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("discord"), size, Color.LIGHT_GRAY));
					} else if (btn == btnReddit) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("reddit"), size, Color.LIGHT_GRAY));
					} else if (btn == btnGitHub) {
						btn.setIcon(ImageUtil.getFlatSVGIconFrom(Icons.get("github"), size, Color.LIGHT_GRAY));
					}
				}
			});
		}
	}

	private void addActionListeners(AbstractButton... buttons) {
		for (AbstractButton btn : buttons) {
			btn.addActionListener(this);
		}
	}

	private void createUI() {
		FormLayout layout = new FormLayout("default, $button:grow, $button",
				"fill:pref, $rgap, fill:pref, $rgap, fill:pref:grow, fill:$rgap, fill:pref, $rgap, fill:pref, $ugap, pref");
		JPanel pnl = new JPanel(layout) {
			private static final long serialVersionUID = 1L;

			//			@Override
			//			protected void paintComponent(Graphics g) {
			//				super.paintComponent(g);
			//				Graphics2D g2d = (Graphics2D) g.create();
			//				int panelWidth = getWidth();
			//				int panelHeight = getHeight();
			//				Theme currentTheme = IconStore.current().getCurrentTheme();
			//				if (currentTheme.getView().hasGradientPaint()) {
			//					GradientPaint p = currentTheme.getView().getGradientPaint();
			//					g2d.setPaint(p);
			//				} else if (currentTheme.getView().hasColor()) {
			//					g2d.setColor(currentTheme.getView().getColor());
			//				}
			//				g2d.fillRect(0, 0, panelWidth, panelHeight);
			//				g2d.dispose();
			//			}
		};
		//		pnl.setOpaque(false);
		pnl.setBorder(Paddings.DIALOG);
		//		getRootPane().setBorder(Paddings.DIALOG);
		CellConstraints cc = new CellConstraints();
		pnl.add(btnLogo, cc.xyw(1, 1, layout.getColumnCount()));
		pnl.add(lblHeader, cc.xyw(1, 3, layout.getColumnCount()));
		pnl.add(txtDescription, cc.xyw(1, 5, layout.getColumnCount()));
		pnl.add(lblCopyright, cc.xyw(1, 9, layout.getColumnCount()));
		JPanel pnlWebsite = new JPanel();
		pnlWebsite.setOpaque(false);
		pnlWebsite.add(lnkWebsite);
		pnl.add(pnlWebsite, cc.xyw(1, 7, layout.getColumnCount()));

		FormLayout layout2 = new FormLayout(
				"default, $lcgap, default, $lcgap, default, $lcgap, default, $lcgap, default, $lcgap, default", "fill:pref");
		// layout2.setColumnGroup(1, 3, 5, 7, 9);
		JPanel pnlSocialButtons = new JPanel(layout2);
		pnlSocialButtons.setOpaque(false);
		CellConstraints cc2 = new CellConstraints();

		int x = 1;
		for (AbstractButton button : socialMediaButtons) {
			button.setBorder(BorderFactory.createEmptyBorder());
			button.setContentAreaFilled(false);
			button.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					super.mouseEntered(e);
					setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
				}

				@Override
				public void mouseExited(MouseEvent e) {
					super.mouseExited(e);
					setCursor(Cursor.getPredefinedCursor(Cursor.DEFAULT_CURSOR));
				}
			});
			pnlSocialButtons.add(button, cc2.xy(x, 1));
			x += 2;
		}
		pnl.add(pnlSocialButtons, cc.xy(1, 11));
		pnl.add(btnClose, cc.xy(3, 11));
		add(pnl);
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == btnLogo) {
			fancyClickCounter++;
			if (fancyClickCounter == 1) {
				UIUtil.showWarningMessage(this, "Yes this is a button."
						+ "\nMaybe you didn't read the tooltip text. You should not click this button!"
						+ "\n\nPls do not click it again, thanks.", "I forgive you");
			} else if (fancyClickCounter > 1) {
				UIUtil.showQuestionMessage(this, "Noooooooo why did you press the button again?!", "Destroy world");
				UIUtil.showInformationMessage(this, "Every time when i ask people not to click my buttons, they click my buttons.", "Destroy world now");
				UIUtil.showQuestionMessage(this, "How would you feel if I click your buttons?", "Destroy world maybe now");
				UIUtil.showWarningMessage(this, "Now you have to live with the consequences", "Destruction is incoming");
				try {
					String url = "https://www.youtube.com/watch?v=5wb5HWVh6Fs";
					Desktop.getDesktop().browse(new URI(url));
				} catch (IOException | URISyntaxException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}
		} else if (source == lnkWebsite) {
			UIUtil.openWebsite("https://emubro.net", this);
		} else if (source == btnClose) {
			dispose();
		}
	}

	public void addOpenContactSiteListener(ActionListener l) {
		for (AbstractButton btn : socialMediaButtons) {
			btn.addActionListener(l);
		}
	}

	public void languageChanged() {
		setTitle(Messages.get(MessageConstants.ABOUT, Messages.get(MessageConstants.APPLICATION_TITLE)));
		txtDescription.setText(Messages.get(MessageConstants.APPLICATION_DESCRIPTION, Messages.get(MessageConstants.APPLICATION_TITLE)));
		btnClose.setText(Messages.get(MessageConstants.CLOSE));
	}
}
