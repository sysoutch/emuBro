package ch.sysout.emubro.ui;

import javax.swing.JLabel;

import ch.sysout.util.ScreenSizeUtil;

public class JLabel2 extends JLabel {
	private static final long serialVersionUID = 1L;

	{
		setFont(ScreenSizeUtil.defaultFont());
	}

	public JLabel2(String text) {
		super(text);
		// super("<html><span style='font-size:150%'>"+text+"</span></html>");
	}

	@Override
	public void setText(String text) {
		super.setText(text);
		// super.setText("<html><span
		// style='font-size:150%'>"+text+"</span></html>");
	}

}
