package ch.sysout.emubro.ui;

import java.awt.Dimension;

import javax.swing.JFrame;
import javax.swing.WindowConstants;

public class MemCardBro extends JFrame {
	private static final long serialVersionUID = 1L;

	public MemCardBro() {
		super("Memory Card Manager");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		pack();
		setPreferredSize(new Dimension(600, 400));
		setLocationRelativeTo(null);
		setVisible(true);
	}
}
