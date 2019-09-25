package ch.sysout.util;

import java.awt.Color;
import java.awt.Component;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Paint;

import javax.swing.ImageIcon;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;

public class SwingUtils {
	/**
	 * Centers the dialog over the given parent component. Also, creates a
	 * semi-transparent panel behind the dialog to mask the parent content. The
	 * title of the dialog is displayed in a custom fashion over the dialog panel,
	 * and a rectangular shadow is placed behind the dialog.
	 */
	public static void createDialogBackPanel(JDialog dialog, Component parent) {
		DialogBackPanel newContentPane = new DialogBackPanel(dialog);
		dialog.setContentPane(newContentPane); // dialog content is replaced by the panel
		dialog.setSize(parent.getSize()); // the dialog is made as wide as the underlying window
		dialog.setLocation(parent.getLocationOnScreen()); // the dialog is placed over this window
	}

	// -------------------------------------------------------------------------

	private static class DialogBackPanel extends JPanel {
		private static final Paint fill = new Color(0xAAFFFFFF, true);
		private static final ImageIcon shadowImage = new ImageIcon(
				SwingUtils.class.getResource("/themes/dark/bg-only.jpg"));
		private final Component cmp;
		private final JLabel title = new JLabel();
		private final JLabel info = new JLabel("Hit 'ESC' to close the dialog");

		public DialogBackPanel(JDialog dialog) {
			cmp = dialog.getContentPane();

			// Misc
			setOpaque(false); // the panel is transparent
			title.setText(dialog.getTitle());

			// Layout of components
			setLayout(null); // absolute layout
			add(cmp);
			add(title);
			add(info);

			// Style the components (here I use my Universal CSS Engine,
			// but you can just use common "setForeground()" type methods.
			//			Style.registerCssClasses(cmp, ".dialogPanel");
			//			Style.registerCssClasses(title, ".dialogTitleLabel");
			//			Style.registerCssClasses(info, ".dialogInfoLabel");
			//			Style.apply(this, new Style(Res.getUrl("css/style.css")));
			cmp.setForeground(Color.RED);

			// Size the components (required for absolute layouts)
			title.setSize(title.getPreferredSize());
			info.setSize(info.getPreferredSize());
			cmp.setSize(cmp.getPreferredSize());
		}

		@Override
		protected void paintComponent(Graphics g) {
			super.paintComponent(g);

			int w = getWidth();
			int h = getHeight();

			// Location of the components:
			// - the dialog original content panel is centered
			// - the title label is placed over it, aligned left
			// - the info label is placed over it, aligned right
			int shadowX = w / 2 - (cmp.getWidth() + 100) / 2;
			int shadowY = h / 2 - (cmp.getHeight() + 100) / 2;
			cmp.setLocation(w / 2 - cmp.getWidth() / 2, h / 2 - cmp.getHeight() / 2);
			title.setLocation(w / 2 - cmp.getWidth() / 2, h / 2 - cmp.getHeight() / 2 - title.getHeight());
			info.setLocation(w / 2 + cmp.getWidth() / 2 - info.getWidth(),
					h / 2 - cmp.getHeight() / 2 - info.getHeight());

			// Paint
			Graphics2D gg = (Graphics2D) g.create();
			gg.setPaint(fill);
			gg.fillRect(0, 0, w, h);
			gg.drawImage(shadowImage.getImage(), shadowX, shadowY, cmp.getWidth() + 100, cmp.getHeight() + 100, null);
			gg.dispose();
		}
	}
}