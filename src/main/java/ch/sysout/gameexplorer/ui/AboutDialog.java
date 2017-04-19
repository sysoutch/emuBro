package ch.sysout.gameexplorer.ui;

import java.awt.Color;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextPane;
import javax.swing.text.SimpleAttributeSet;
import javax.swing.text.StyleConstants;
import javax.swing.text.StyledDocument;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class AboutDialog extends JDialog implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JLabel lblIcon = new JLabel(ImageUtil.getImageIconFrom(Icons.get("applicationIcon", 96, 96)));
	private JTextPane lblHeader = new JTextPane();
	private JTextPane txtDescription = new JTextPane();
	private JTextPane lblCopyright = new JTextPane();
	private JTextPane lnkWebsite = new JTextPane();

	int size = ScreenSizeUtil.is3k() ? 32 : 24;
	private JButton btnFacebook = new JButton(ImageUtil.getImageIconFrom(Icons.get("facebook", size, size)));
	private JButton btnTwitter = new JButton(ImageUtil.getImageIconFrom(Icons.get("twitter", size, size)));
	private JButton btnGooglePlus = new JButton(ImageUtil.getImageIconFrom(Icons.get("googleplus", size, size)));
	private JButton btnYoutube = new JButton(ImageUtil.getImageIconFrom(Icons.get("youtube", size, size)));

	private JButton[] socialMediaButtons = new JButton[] { btnFacebook, btnTwitter, btnGooglePlus, btnYoutube };

	private JButton btnClose = new JButton(Messages.get("close"));

	public AboutDialog() {
		setTitle(Messages.get("about", Messages.get("applicationTitle")));
		setDefaultCloseOperation(DISPOSE_ON_CLOSE);
		setModalityType(ModalityType.APPLICATION_MODAL);
		setIconImages(getIcons());
		// setResizable(false);
		initComponents();
		createUI();

		pack();
		// adjustSizeWhenNeeded();
		txtDescription.setText(Messages.get("applicationDescription", Messages.get("applicationTitle")));
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
		btnFacebook.setActionCommand("https://www.facebook.com/emubr0");
		btnTwitter.setActionCommand("https://twitter.com/sysoutch");
		btnGooglePlus.setActionCommand("https://plus.google.com/+RainerWahnsinn77");
		btnYoutube.setActionCommand("https://www.youtube.com/c/rainerwahnsinn77");

		lblHeader.setOpaque(false);
		lblCopyright.setOpaque(false);
		txtDescription.setOpaque(false);
		lnkWebsite.setOpaque(false);
		lnkWebsite.setOpaque(false);

		lblHeader.setText(Messages.get("applicationTitle"));
		lblCopyright.setText("\u00a9 2015 sysout.ch");
		lnkWebsite.setText(Messages.get("website"));
		lnkWebsite.setForeground(Color.BLUE);

		lblHeader.setEditable(false);
		txtDescription.setEditable(false);
		lblCopyright.setEditable(false);
		lnkWebsite.setEditable(false);

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

		doc = lnkWebsite.getStyledDocument();
		center = new SimpleAttributeSet();
		StyleConstants.setAlignment(center, StyleConstants.ALIGN_CENTER);
		doc.setParagraphAttributes(0, doc.getLength(), center, false);

		setToolTipTexts();
		addListeners();
	}

	private void setToolTipTexts() {
		btnFacebook.setToolTipText("Facebook");
		btnTwitter.setToolTipText("Twitter");
		btnGooglePlus.setToolTipText("Google+");
		btnYoutube.setToolTipText("YouTube");
	}

	private void addListeners() {
		addActionListeners(btnFacebook, btnTwitter, btnGooglePlus, btnYoutube, btnClose);
	}

	private void addActionListeners(AbstractButton... o) {
		for (AbstractButton obj : o) {
			obj.addActionListener(this);

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
		add(lnkWebsite, cc.xyw(1, 7, layout.getColumnCount()));

		FormLayout layout2 = new FormLayout(
				"default, $lcgap, default, $lcgap, default, $lcgap, default, $lcgap, default", "fill:pref");
		// layout2.setColumnGroup(1, 3, 5, 7, 9);
		JPanel pnlSocialButtons = new JPanel(layout2);
		CellConstraints cc2 = new CellConstraints();

		int x = 1;
		for (JButton button : socialMediaButtons) {
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
		if (source == btnClose) {
			dispose();
		}
	}

	public void addOpenContactSiteListener(ActionListener l) {
		btnFacebook.addActionListener(l);
		btnTwitter.addActionListener(l);
		btnYoutube.addActionListener(l);
		btnGooglePlus.addActionListener(l);
	}

	public void languageChanged() {
		setTitle(Messages.get("about", Messages.get("applicationTitle")));
		txtDescription.setText(Messages.get("applicationDescription", Messages.get("applicationTitle")));
		btnClose.setText(Messages.get("close"));
	}
}
