package ch.sysout.emubro.ui;

import javax.swing.JLabel;

import ch.sysout.util.FontUtil;

public class JLabel2 extends JLabel {
	private static final long serialVersionUID = 1L;
	//	private static Color colorDefaultForeground = Color.WHITE;

	{
		setFont(FontUtil.getCustomFont());
	}

	public JLabel2(String text) {
		super(text);
		//		setForeground(colorDefaultForeground);
	}

	@Override
	public void setText(String text) {
		super.setText(text);
	}
}
