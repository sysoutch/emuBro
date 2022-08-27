package ch.sysout.ui.util;

import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

import javax.swing.Action;
import javax.swing.Icon;
import javax.swing.JToggleButton;

public class JCustomToggleButton extends JToggleButton {
	private static final long serialVersionUID = 1L;

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
		super(text, icon, selected);
		if (!selected) {
			setBorderPainted(false);
			setContentAreaFilled(false);
		}
		addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				setBorderPainted(true);
				setContentAreaFilled(true);
			}

			@Override
			public void mouseExited(MouseEvent e) {
				if (!isSelected()) {
					setBorderPainted(false);
					setContentAreaFilled(false);
				}
			}
		});
	}

	@Override
	public void setSelected(boolean b) {
		super.setSelected(b);
		setButtonDecorationEnabled(b);
	}

	public void setButtonDecorationEnabled(boolean b) {
		setBorderPainted(b);
		setContentAreaFilled(b);
	}
}
