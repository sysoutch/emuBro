package ch.sysout.emubro.ui;

import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.beans.ConstructorProperties;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import javax.swing.*;

public class JCustomButtonNew extends JButton {
	private static final long serialVersionUID = 1L;

	protected boolean hover;
	private List<JButton> linkedWith = new ArrayList<>();

	/**
	 * Creates a button with no set text or icon.
	 */
	public JCustomButtonNew() {
		this(null, null);
	}

	/**
	 * Creates a button with an icon.
	 *
	 * @param icon  the Icon image to display on the button
	 */
	public JCustomButtonNew(Icon icon) {
		this(null, icon);
	}

	/**
	 * Creates a button with text.
	 *
	 * @param text  the text of the button
	 */
	@ConstructorProperties({"text"})
	public JCustomButtonNew(String text) {
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
	public JCustomButtonNew(Action a) {
		this();
		setAction(a);
	}

	/**
	 * Creates a button with initial text and an icon.
	 *
	 * @param text  the text of the button
	 * @param icon  the Icon image to display on the button
	 */
	public JCustomButtonNew(String text, Icon icon) {
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
				setBorderPainted(true);
				setContentAreaFilled(true);
				for (JButton btn : linkedWith) {
					btn.setBorderPainted(true);
					btn.setContentAreaFilled(true);
				}
			}

			@Override
			public void mouseExited(MouseEvent e) {
				setBorderPainted(false);
				setContentAreaFilled(false);
				for (JButton btn : linkedWith) {
					btn.setBorderPainted(false);
					btn.setContentAreaFilled(false);
				}
			}
		});
		addFocusListener(new FocusAdapter() {
			@Override
			public void focusGained(FocusEvent e) {
				setBorderPainted(true);
				setContentAreaFilled(true);
				for (JButton btn : linkedWith) {
					btn.setBorderPainted(true);
					btn.setContentAreaFilled(true);
				}
			}

			@Override
			public void focusLost(FocusEvent e) {
				setBorderPainted(false);
				setContentAreaFilled(false);
				for (JButton btn : linkedWith) {
					btn.setBorderPainted(false);
					btn.setContentAreaFilled(false);
				}
			}
		});
	}

	public void linkWith(JButton... otherButtons) {
        linkedWith.addAll(Arrays.asList(otherButtons));
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
