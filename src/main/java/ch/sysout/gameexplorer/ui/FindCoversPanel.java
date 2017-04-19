package ch.sysout.gameexplorer.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.net.MalformedURLException;
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

public class FindCoversPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private List<JComponent> pictures = new ArrayList<>();

	private JButton btnSearchCovers = new JButton("Ergebnisse der Google Bildersuche");

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
		URL url;
		URL[] urls = null;
		try {
			url = new URL(
					"http://domustation.altervista.org/wp-content/uploads/spyro-2-gateway-to-glimmer-SCES-02104-Front.jpg");
			URL url2 = new URL("http://s.emuparadise.org/fup/up/52799-Spyro_2_-_Gateway_to_Glimmer_(E)-1.jpg");
			URL url3 = new URL("http://www.thecoverproject.net/images/covers/gbc_nba3on3featuringkobebryant_2.jpg");
			URL url4 = new URL("http://www.thecoverproject.net/images/covers/gc_legendofzeldathewindwaker_9_thumb.jpg");
			URL url5 = new URL("http://www.thecoverproject.net/images/covers/n64_rayman2_3_thumb.jpg");
			URL url6 = new URL("https://www.mediafire.com/convkey/481b/d81orbfaib231z05g.jpg");
			URL url7 = new URL("https://www.mediafire.com/convkey/b312/2qj62p46z5rx1j35g.jpg");
			URL url8 = new URL("https://www.mediafire.com/convkey/d10c/52ui7lza86eseks5g.jpg");

			urls = new URL[] { url, url2, url3, url4, url5, url6, url7, url8 };
		} catch (MalformedURLException e) {
			e.printStackTrace();
		}
		if (urls != null) {
			PictureWorker t = new PictureWorker(urls);
			t.execute();
			btnSearchCovers.setVisible(false);
		}

		// try {
		// URL googleImagesUrl = new
		// URL("https://www.google.com/search?tbm=isch&q=Spyro+The+Dragon+Cover");
		// URLConnection connection = googleImagesUrl.openConnection();
		// BufferedReader in = new BufferedReader(new
		// InputStreamReader(connection.getInputStream()));
		//
		// StringBuilder response = new StringBuilder();
		// String inputLine;
		// while ((inputLine = in.readLine()) != null) {
		// response.append(inputLine);
		// }
		// in.close();
		// System.err.println(response.toString());
		// } catch (IOException e1) {
		// // TODO Auto-generated catch block
		// e1.printStackTrace();
		// }

		// try {
		// URL url = new
		// URL("https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q=Godfather");
		// URLConnection connection = url.openConnection();
		//
		// String line;
		// StringBuilder builder = new StringBuilder();
		// BufferedReader reader = new BufferedReader(new
		// InputStreamReader(connection.getInputStream()));
		// while((line = reader.readLine()) != null) {
		// builder.append(line);
		// }
		// reader.close();
		//
		// JsonReader reader1 = Json.createReader(connection.getInputStream());
		// JsonObject json = reader1.readObject();
		// String imageUrl =
		// json.getJsonObject("responseData").getJsonArray("results").getJsonObject(0).getString("url");
		// reader1.close();
		//
		// BufferedImage image = ImageIO.read(new URL(imageUrl));
		// JOptionPane.showMessageDialog(null, "", "",
		// JOptionPane.INFORMATION_MESSAGE, new ImageIcon(image));
		// } catch(Exception e) {
		// JOptionPane.showMessageDialog(null, e.getMessage(), "Failure",
		// JOptionPane.ERROR_MESSAGE);
		// e.printStackTrace();
		// }
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
				final JToggleButton chk = new JToggleButton();
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
			System.out.println("done");
			final JToggleButton lbl = new JToggleButton("Show more pictures...");
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
