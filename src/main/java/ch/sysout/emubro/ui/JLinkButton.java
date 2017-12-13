package ch.sysout.emubro.ui;

import java.awt.Cursor;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.JLabel;

/**
 * @author heribert
 *
 */
public class JLinkLabel extends JLabel implements MouseListener, FocusListener {
	private static final long serialVersionUID = 1L;

	private boolean styleEnabled = true;
	private String text = "";

	{
		addMouseListener(JLinkLabel.this);
		addFocusListener(JLinkLabel.this);
	}

	/**
	 * Creates a <code>JLinkLabel</code> instance with no image and with an
	 * empty string for the title.
	 */
	public JLinkLabel() {
		this("");
	}

	/**
	 * Creates a <code>JLinkLabel</code> instance with the specified text.
	 *
	 * @param text
	 */
	public JLinkLabel(String text) {
		this.text = text;
	}

	void doHover(boolean b) {
		Cursor cursor = (b) ? Cursor.getPredefinedCursor(Cursor.HAND_CURSOR) : null;
		setCursor(cursor);
		String style = (b) ? "underline" : "none";
		super.setText("<html><a href='' style='text-decoration: " + style + "'>" + text + "</a></html>");
	}

	@Override
	public void mouseEntered(MouseEvent e) {
		doHover(true);
		if (styleEnabled) {
			setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
		} else {
			setCursor(null);
		}
	}

	@Override
	public void mouseExited(MouseEvent e) {
		doHover(false);
		setCursor(null);
	}

	@Override
	public void mouseClicked(MouseEvent e) {
	}

	@Override
	public void mousePressed(MouseEvent e) {
	}

	@Override
	public void mouseReleased(MouseEvent e) {
	}

	@Override
	public String toString() {
		return getText();
	}

	@Override
	public void focusGained(FocusEvent e) {
		doHover(true);
	}

	@Override
	public void focusLost(FocusEvent e) {
		doHover(false);
	}

	@Override
	public void setText(String text) {
		super.setText(text);
		this.text = text;
		doHover(false);
	}
}
