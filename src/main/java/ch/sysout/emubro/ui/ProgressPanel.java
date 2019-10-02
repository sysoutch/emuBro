package ch.sysout.emubro.ui;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Insets;
import java.awt.event.ActionListener;
import java.awt.event.MouseListener;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.plaf.basic.BasicProgressBarUI;

import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.ui.util.JCustomButton;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class ProgressPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private JProgressBar prgBrowseComputer = new JProgressBar();
	private JButton btnInterruptProgress = new JCustomButton();

	public ProgressPanel() {
		super();
		initComponents();
		createUI();
	}

	private void initComponents() {
		prgBrowseComputer.setBorder(BorderFactory.createEmptyBorder());
		prgBrowseComputer.setUI(new BasicProgressBarUI() {
			GradientPaint gradient = new GradientPaint(50, 50, new Color(62, 123, 168),
					300, 100, new Color(32, 92, 124));

			@Override
			protected void paintDeterminate(Graphics g, JComponent c) {
				//				super.paintIndeterminate(g, c);
				if (!(g instanceof Graphics2D)) {
					return;
				}

				Insets b = progressBar.getInsets(); // area for border
				int barRectWidth = progressBar.getWidth() - (b.right + b.left);
				int barRectHeight = progressBar.getHeight() - (b.top + b.bottom);

				if (barRectWidth <= 0 || barRectHeight <= 0) {
					return;
				}

				int cellLength = getCellLength();
				int cellSpacing = getCellSpacing();
				// amount of progress to draw
				int amountFull = getAmountFull(b, barRectWidth, barRectHeight);

				Graphics2D g2 = (Graphics2D)g;
				g2.setPaint(gradient);

				// draw the cells
				if (cellSpacing == 0 && amountFull > 0) {
					// draw one big Rect because there is no space between cells
					g2.setStroke(new BasicStroke(barRectHeight,
							BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL));
				} else {
					// draw each individual cell
					g2.setStroke(new BasicStroke(barRectHeight,
							BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL,
							0.f, new float[] { cellLength, cellSpacing }, 0.f));
				}

				g2.drawLine(b.left, (barRectHeight/2) + b.top,
						amountFull + b.left, (barRectHeight/2) + b.top);

				// Deal with possible text painting
				if (progressBar.isStringPainted()) {
					paintString(g, b.left, b.top,
							barRectWidth, barRectHeight,
							amountFull, b);
				}
			}
		});
		prgBrowseComputer.setString(" " + Messages.get("browseComputerForGames") + " ");
		prgBrowseComputer.setOpaque(false);
		prgBrowseComputer.setStringPainted(true);
		prgBrowseComputer.setIndeterminate(true);
		prgBrowseComputer.setMinimumSize(new Dimension(0, 0));
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		btnInterruptProgress.setIcon(ImageUtil.getImageIconFrom(Icons.get("interruptProcess", size, size)));
	}

	public void addBrowseComputerProgressBarListener(MouseListener l) {
		prgBrowseComputer.addMouseListener(l);
	}

	private void createUI() {
		FormLayout layout = new FormLayout("default, $lcgap, default", "fill:pref");
		setLayout(layout);
		// setBorder(Paddings.TABBED_DIALOG);
		CellConstraints cc = new CellConstraints();
		add(prgBrowseComputer, cc.xy(1, 1));
		add(btnInterruptProgress, cc.xy(3, 1));
	}

	public void setProgressBarSpace(int i) {
		prgBrowseComputer
		.setMinimumSize(new Dimension(prgBrowseComputer.getWidth() + i, prgBrowseComputer.getHeight()));
	}

	public void addInterruptSearchProcessListener(ActionListener l) {
		btnInterruptProgress.addActionListener(l);
	}

	public void languageChanguage() {
		prgBrowseComputer.setString(" " + Messages.get("browseComputerForGames") + " ");
	}
}