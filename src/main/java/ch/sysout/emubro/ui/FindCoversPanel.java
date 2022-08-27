package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;
import javax.swing.ButtonGroup;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.JToggleButton;
import javax.swing.SwingWorker;

import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.JCustomButton;
import ch.sysout.ui.util.JCustomToggleButton;

public class FindCoversPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private List<JComponent> pictures = new ArrayList<>();

	private JButton btnSearchCovers = new JCustomButton("Results of image search");

	private JPanel pnlCovers = new JPanel();

	public FindCoversPanel() {
		super(new BorderLayout());
		initComponents();
		createUI();
	}

	private void initComponents() {
		btnSearchCovers.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				remove(btnSearchCovers);
				add(pnlCovers);
				validate();
				repaint();
				fetchCovers();
			}
		});
	}

	private void createUI() {
		WrapLayout wl = new WrapLayout();
		wl.setAlignment(FlowLayout.LEFT);
		pnlCovers.setLayout(wl);
		pnlCovers.setMinimumSize(new Dimension(0, 0));
		pnlCovers.removeAll();
		pnlCovers.setBackground(Color.WHITE);

		add(btnSearchCovers, BorderLayout.WEST);
	}

	public void fetchCovers() {
		btnSearchCovers.setEnabled(false);
		URL[] urls = null;
		if (urls != null) {
			PictureWorker t = new PictureWorker(urls);
			t.execute();
			btnSearchCovers.setVisible(false);
		}
	}

	class PictureWorker extends SwingWorker<Integer, Image> {
		List<Image> images = new ArrayList<>();
		private URL[] urls;
		private ButtonGroup group = new ButtonGroup();

		public PictureWorker(URL[] urls) {
			this.urls = urls;
		}

		@Override
		protected Integer doInBackground() throws Exception {
			images.clear();
			for (URL u : urls) {
				Image img = ImageIO.read(u);
				publish(img);
				images.add(img);
			}
			return 1;
		}

		@Override
		protected void process(List<Image> chunks) {
			for (Image image : chunks) {
				ImageIcon icon = new ImageIcon(image);
				ImageIcon scaledIcon;
				if (icon.getIconWidth() > icon.getIconHeight()) {
					scaledIcon = ImageUtil.scaleCover(icon, 96, CoverConstants.SCALE_HEIGHT_OPTION);
				} else {
					scaledIcon = ImageUtil.scaleCover(icon, 96, CoverConstants.SCALE_WIDTH_OPTION);
				}
				final JToggleButton chk = new JCustomToggleButton();
				chk.setPreferredSize(new Dimension(152, 152));
				chk.setBorderPainted(false);
				chk.setContentAreaFilled(false);
				chk.setIcon(scaledIcon);
				chk.addMouseListener(new MouseAdapter() {
					@Override
					public void mouseEntered(MouseEvent e) {
						chk.setBorderPainted(true);
						chk.setContentAreaFilled(true);
					}

					@Override
					public void mouseExited(MouseEvent e) {
						if (!chk.isSelected()) {
							chk.setBorderPainted(false);
							chk.setContentAreaFilled(false);
						}
					}
				});
				pnlCovers.add(chk);
				pictures.add(chk);
				group.add(chk);
				pnlCovers.validate();
				pnlCovers.repaint();
			}
		}

		@Override
		protected void done() {
			final JToggleButton lbl = new JCustomToggleButton("Show more pictures...");
			lbl.setBorderPainted(false);
			lbl.setContentAreaFilled(false);
			lbl.addMouseListener(new MouseAdapter() {
				@Override
				public void mouseEntered(MouseEvent e) {
					lbl.setBorderPainted(true);
					lbl.setContentAreaFilled(true);
				}

				@Override
				public void mouseExited(MouseEvent e) {
					if (!lbl.isSelected()) {
						lbl.setBorderPainted(false);
						lbl.setContentAreaFilled(false);
					}
				}
			});
			pnlCovers.add(lbl);
			pnlCovers.validate();
			pnlCovers.repaint();
		}
	}
}
