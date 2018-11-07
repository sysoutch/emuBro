package ch.sysout.emubro.ui;

import java.awt.Cursor;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.SwingConstants;

/**
 * @author sysout.ch
 *
 * this class was named JLinkLabel before and extended JLabel.
 * The class was changed cause of the need of the ability to setFocusable(true)
 *
 */
public class JLinkButton extends JButton implements MouseListener, FocusListener {
	private static final long serialVersionUID = 1L;

	private boolean styleEnabled = true;
	private String text = "";

	{
		addMouseListener(JLinkButton.this);
		addFocusListener(JLinkButton.this);
	}

	/**
	 * Creates a <code>JLinkButton</code> instance with no image and with an
	 * empty string for the title.
	 */
	public JLinkButton() {
		this("");
	}

	/**
	 * Creates a <code>JLinkButton</code> instance with the specified text.
	 *
	 * @param text
	 */
	public JLinkButton(String text) {
		super.setText(text);
		this.text = text;
		setHorizontalAlignment(SwingConstants.LEFT);
		setBorder(BorderFactory.createEmptyBorder());
		setContentAreaFilled(false);
		setFocusPainted(false);
		doHover(false);
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
