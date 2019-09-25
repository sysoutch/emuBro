package ch.sysout.ui.util;

import java.awt.Color;
import java.awt.Graphics;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

import javax.swing.Action;
import javax.swing.Icon;
import javax.swing.JToggleButton;

public class JCustomToggleButton extends JToggleButton {
	private static final long serialVersionUID = 1L;

	private Color colorHover = new Color(0f, 0f, 0f, 0.2f);
	private Color colorSelected = new Color(0f, 0f, 0f, 0.25f);

	protected boolean hover;

	/**
	 * Creates an initially unselected toggle button
	 * without setting the text or image.
	 */
	public JCustomToggleButton () {
		this(null, null, false);
	}

	/**
	 * Creates an initially unselected toggle button
	 * with the specified image but no text.
	 *
	 * @param icon  the image that the button should display
	 */
	public JCustomToggleButton(Icon icon) {
		this(null, icon, false);
	}

	/**
	 * Creates a toggle button with the specified image
	 * and selection state, but no text.
	 *
	 * @param icon  the image that the button should display
	 * @param selected  if true, the button is initially selected;
	 *                  otherwise, the button is initially unselected
	 */
	public JCustomToggleButton(Icon icon, boolean selected) {
		this(null, icon, selected);
	}

	/**
	 * Creates an unselected toggle button with the specified text.
	 *
	 * @param text  the string displayed on the toggle button
	 */
	public JCustomToggleButton (String text) {
		this(text, null, false);
	}

	/**
	 * Creates a toggle button with the specified text
	 * and selection state.
	 *
	 * @param text  the string displayed on the toggle button
	 * @param selected  if true, the button is initially selected;
	 *                  otherwise, the button is initially unselected
	 */
	public JCustomToggleButton (String text, boolean selected) {
		this(text, null, selected);
	}

	/**
	 * Creates a toggle button where properties are taken from the
	 * Action supplied.
	 *
	 * @since 1.3
	 */
	public JCustomToggleButton(Action a) {
		this();
		setAction(a);
	}

	/**
	 * Creates a toggle button that has the specified text and image,
	 * and that is initially unselected.
	 *
	 * @param text the string displayed on the button
	 * @param icon  the image that the button should display
	 */
	public JCustomToggleButton(String text, Icon icon) {
		this(text, icon, false);
	}

	/**
	 * Creates a toggle button with the specified text, image, and
	 * selection state.
	 *
	 * @param text the text of the toggle button
	 * @param icon  the image that the button should display
	 * @param selected  if true, the button is initially selected;
	 *                  otherwise, the button is initially unselected
	 */
	public JCustomToggleButton (String text, Icon icon, boolean selected) {
		//        // Create the model
		//        setModel(new ToggleButtonModel());
		//
		//        model.setSelected(selected);
		//
		//        // initialize
		//        init(text, icon);
		super(text, icon, selected);
		setOpaque(false);
		setBorderPainted(false);
		setContentAreaFilled(false);
		addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				hover = true;
			}

			@Override
			public void mouseExited(MouseEvent e) {
				hover = false;
			}
		});

	}

	@Override
	protected void paintComponent(Graphics g) {
		if (isEnabled()) {
			if (isSelected()) {
				g.setColor(colorSelected);
				g.fillRect(0, 0, getWidth(), getHeight());
			} else if (hover) {
				g.setColor(colorHover);
				g.fillRect(0, 0, getWidth(), getHeight());
			}
		}
		super.paintComponent(g);
		g.dispose();
	}
}
