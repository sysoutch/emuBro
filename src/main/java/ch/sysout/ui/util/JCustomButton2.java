package ch.sysout.ui.util;

import java.awt.Color;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.beans.ConstructorProperties;

import javax.swing.Action;
import javax.swing.Icon;
import javax.swing.JButton;

public class JCustomButton2 extends JButton {
	private static final long serialVersionUID = 1L;

	private Color colorHover = new Color(0f, 0f, 0f, 0.2f);
	private Color colorSelected = new Color(0f, 0f, 0f, 0.25f);

	protected boolean hover;

	private boolean keepBackgroundOnHoverLost;

	/**
	 * Creates a button with no set text or icon.
	 */
	public JCustomButton2() {
		this(null, null);
	}

	/**
	 * Creates a button with an icon.
	 *
	 * @param icon  the Icon image to display on the button
	 */
	public JCustomButton2(Icon icon) {
		this(null, icon);
	}

	/**
	 * Creates a button with text.
	 *
	 * @param text  the text of the button
	 */
	@ConstructorProperties({"text"})
	public JCustomButton2(String text) {
		this(text, null);
	}

	/**
	 * Creates a button where properties are taken from the
	 * <code>Action</code> supplied.
	 *
	 * @param a the <code>Action</code> used to specify the new button
	 *
	 * @since 1.3
	 */
	public JCustomButton2(Action a) {
		this();
		setAction(a);
	}

	/**
	 * Creates a button with initial text and an icon.
	 *
	 * @param text  the text of the button
	 * @param icon  the Icon image to display on the button
	 */
	public JCustomButton2(String text, Icon icon) {
		//        // Create the model
		//        setModel(new DefaultButtonModel());
		//
		//        // initialize
		//        init(text, icon);
		super(text, icon);
		setBorderPainted(false);
		setContentAreaFilled(false);
		addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				//				hover = true;
				//				repaint();
				setBorderPainted(true);
				setContentAreaFilled(true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				//				hover = false;
				//				repaint();
				setBorderPainted(false);
				setContentAreaFilled(false);
			}
		});
	}

	public void setKeepBackgroundOnHoverLost(boolean keepBackgroundOnHoverLost) {
		this.keepBackgroundOnHoverLost = keepBackgroundOnHoverLost;
	}

	//	@Override
	//		protected void paintComponent(Graphics g) {
	//			if (isEnabled()) {
	//				if (keepBackgroundOnHoverLost) {
	//					g.setColor(hover ? colorSelected : colorHover);
	//					g.fillRect(0, 0, getWidth(), getHeight());
	//				} else {
	//					if (hover) {
	//						g.setColor(colorHover);
	//						g.fillRect(0, 0, getWidth(), getHeight());
	//					}
	//				}
	//			}
	//			super.paintComponent(g);
	//			g.dispose();
	//		}
}
