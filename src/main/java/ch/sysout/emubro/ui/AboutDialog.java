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

import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class AboutDialog extends JDialog implements ActionListener {
	private static final long serialVersionUID = 1L;

	private AbstractButton lblIcon = new JButton(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", 96, 96)));
	private JTextPane lblHeader = new JTextPane();
	private JTextPane txtDescription = new JTextPane();
	private JTextPane lblCopyright = new JTextPane();
	private JLinkButton lnkWebsite = new JLinkButton();

	int size = ScreenSizeUtil.is3k() ? 32 : 24;
	private JButton btnDiscord = new JButton(ImageUtil.getImageIconFrom(Icons.get("discord", size, size)));
	private JButton btnFacebook = new JButton(ImageUtil.getImageIconFrom(Icons.get("facebook", size, size)));
	private JButton btnTwitter = new JButton(ImageUtil.getImageIconFrom(Icons.get("twitter", size, size)));
	private JButton btnYoutube = new JButton(ImageUtil.getImageIconFrom(Icons.get("youtube", size, size)));
	private JButton btnGitHub = new JButton(ImageUtil.getImageIconFrom(Icons.get("github", size, size)));

	private AbstractButton[] socialMediaButtons = new JButton[] { btnDiscord, btnFacebook, btnTwitter, btnYoutube, btnGitHub };

	private JButton btnClose = new JButton(Messages.get(MessageConstants.CLOSE));

	private int fancyButtonClickCounter;

	public AboutDialog() {
		setTitle(Messages.get(MessageConstants.ABOUT, Messages.get(MessageConstants.APPLICATION_TITLE)));
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
		// setResizable(false);
		initComponents();
		createUI();

		pack();
		// adjustSizeWhenNeeded();
		txtDescription.setText(Messages.get(MessageConstants.APPLICATION_DESCRIPTION, Messages.get(MessageConstants.APPLICATION_TITLE)));
		setSize(new Dimension(getWidth(),
				getHeight()
				// + txtDescription.getHeight()
				// + lblHeader.getHeight()
				// + lblCopyright.getHeight()
				+ btnFacebook.getHeight() * 2));
		setMinimumSize(getSize());
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
		lblIcon.setFocusable(false);
		lblIcon.setBorderPainted(false);
		lblIcon.setContentAreaFilled(false);
		setActionCommands();

		setOpaque(false, lblHeader, lblCopyright, txtDescription, lnkWebsite);

		initTexts();
		lnkWebsite.setForeground(Color.BLUE);

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
		lblHeader.setText(Messages.get(MessageConstants.APPLICATION_TITLE));
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
		btnDiscord.setActionCommand("https://discordapp.com/invite/KFYCgqY");
		btnFacebook.setActionCommand("https://www.facebook.com/emubr0");
		btnTwitter.setActionCommand("https://twitter.com/sysoutch");
		btnYoutube.setActionCommand("https://www.youtube.com/c/rainerwahnsinn77");
		btnGitHub.setActionCommand("https://github.com/sysoutch/emubro");
	}

	private void setToolTipTexts() {
		lblIcon.setToolTipText("Don't click this button! (Yes this is a button)");
		lnkWebsite.setToolTipText("Visit our fancy website, yayy!");
		btnDiscord.setToolTipText("Chat with us in our Discord");
		btnFacebook.setToolTipText("Hate us on Facebook");
		btnTwitter.setToolTipText("Follow us on Twitter");
		btnYoutube.setToolTipText("Subscribe on YouTube");
		btnGitHub.setToolTipText("Help develop emuBro at GitHub");
	}

	private void addListeners() {
		UIUtil.installEscapeCloseOperation(this);
		addActionListeners(lblIcon, lnkWebsite, btnClose);
	}

	private void addActionListeners(AbstractButton... o) {
		for (AbstractButton btn : o) {
			btn.addActionListener(this);
		}
	}

	private void createUI() {
		FormLayout layout = new FormLayout("default, $button:grow, $button",
				"fill:pref, $rgap, fill:pref, $rgap, fill:pref:grow, fill:$rgap, fill:pref, $rgap, fill:pref, $ugap, pref");
		setLayout(layout);
		getRootPane().setBorder(Paddings.DIALOG);
		CellConstraints cc = new CellConstraints();
		add(lblIcon, cc.xyw(1, 1, layout.getColumnCount()));
		add(lblHeader, cc.xyw(1, 3, layout.getColumnCount()));
		add(txtDescription, cc.xyw(1, 5, layout.getColumnCount()));
		add(lblCopyright, cc.xyw(1, 9, layout.getColumnCount()));
		JPanel pnlWebsite = new JPanel();
		pnlWebsite.add(lnkWebsite);
		add(pnlWebsite, cc.xyw(1, 7, layout.getColumnCount()));

		FormLayout layout2 = new FormLayout(
				"default, $lcgap, default, $lcgap, default, $lcgap, default, $lcgap, default", "fill:pref");
		// layout2.setColumnGroup(1, 3, 5, 7, 9);
		JPanel pnlSocialButtons = new JPanel(layout2);
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
		add(pnlSocialButtons, cc.xy(1, 11));
		add(btnClose, cc.xy(3, 11));
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		Object source = e.getSource();
		if (source == lblIcon) {
			UIUtil.showInformationMessage(this, "Maybe you didn't read the tooltip text. You should not click this button!", "Destroy world");
			UIUtil.showInformationMessage(this, "Anyways, you've clicked the button already", "Destroy world");
			UIUtil.showInformationMessage(this, "Every time when i ask people not to click my buttons, they click my buttons.", "Destroy world now");
			UIUtil.showInformationMessage(this, "How would you feel if I click your buttons?", "Destroy world maybe now");
			UIUtil.showInformationMessage(this, "Now you have to live with the consequences", "Destruction is incoming");

			try {
				String url = "https://www.youtube.com/watch?v=1PNoHDD5iXo";
				Desktop.getDesktop().browse(new URI(url));
			} catch (IOException | URISyntaxException e1) {
				// TODO Auto-generated catch block
				e1.printStackTrace();
			}
		} else if (source == lnkWebsite) {
			try {
				UIUtil.openWebsite("https://emubro.net");
			} catch (IOException e1) {
				UIUtil.showWarningMessage(this, "Maybe there is a conflict with your default web browser and you have to set it again."
						+ "\n\nThe default program page in control panel will be opened now..", "default web browser");
				try {
					Runtime.getRuntime().exec("control.exe /name Microsoft.DefaultPrograms /page pageDefaultProgram");
				} catch (IOException e2) {
					UIUtil.showErrorMessage(this, "The default program page couldn't be opened.", "oops");
				}
			} catch (URISyntaxException e1) {
				UIUtil.showErrorMessage(this, "The url couldn't be opened.", "oops");
			}
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
