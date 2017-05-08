package ch.sysout.emubro.ui;

import javax.swing.Action;
import javax.swing.DefaultButtonModel;
import javax.swing.Icon;
import javax.swing.JButton;

public class ButtonBarButton extends JButton {
	private static final long serialVersionUID = 1L;

	private Icon icon;
	private String label;
	private String toolTipText;

	public ButtonBarButton(String label, Icon icon, String toolTipText) {
		this(label, icon);
		setFocusable(false);
		setBorderPainted(false);
		setContentAreaFilled(false);
		setToolTipText(toolTipText);
	}

	/**
	 * Creates a <code>ButtonBarButton</code> with no text or icon set.
	 */
	public ButtonBarButton() {
		this(null, (Icon) null);
	}

	/**
	 * Creates a <code>ButtonBarButton</code> with the specified icon.
	 *
	 * @param icon
	 *            the icon of the <code>ButtonBarButton</code>
	 */
	public ButtonBarButton(Icon icon) {
		this(null, icon);
	}

	/**
	 * Creates a <code>ButtonBarButton</code> with the specified text.
	 *
	 * @param text
	 *            the text of the <code>ButtonBarButton</code>
	 */
	public ButtonBarButton(String text) {
		this(text, (Icon) null);
	}

	/**
	 * Creates a menu item whose properties are taken from the specified
	 * <code>Action</code>.
	 *
	 * @param a
	 *            the action of the <code>ButtonBarButton</code>
	 * @since 1.3
	 */
	public ButtonBarButton(Action a) {
		this();
		setAction(a);
	}

	/**
	 * Creates a <code>ButtonBarButton</code> with the specified text and icon.
	 *
	 * @param text
	 *            the text of the <code>ButtonBarButton</code>
	 * @param icon
	 *            the icon of the <code>ButtonBarButton</code>
	 */
	public ButtonBarButton(String text, Icon icon) {
		setModel(new DefaultButtonModel());
		init(text, icon);
	}

	/**
	 * Creates a <code>ButtonBarButton</code> with the specified text and
	 * keyboard mnemonic.
	 *
	 * @param text
	 *            the text of the <code>ButtonBarButton</code>
	 * @param mnemonic
	 *            the keyboard mnemonic for the <code>ButtonBarButton</code>
	 */
	public ButtonBarButton(String text, int mnemonic) {
		setModel(new DefaultButtonModel());
		init(text, null);
		setMnemonic(mnemonic);
	}

	public void show(boolean label, boolean icon, boolean toolTipText) {
		setText(label ? this.label : "");
		setIcon(icon ? this.icon : null);
		setToolTipText(toolTipText ? this.toolTipText : "");
	}
}
