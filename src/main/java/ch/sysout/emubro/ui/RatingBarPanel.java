package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.FlowLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.controller.GameSelectionListener;
import ch.sysout.emubro.ui.event.RateEvent;
import ch.sysout.emubro.ui.listener.RateListener;
import ch.sysout.emubro.util.ColorConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class RatingBarPanel extends JPanel implements ActionListener, FocusListener, MouseListener, GameSelectionListener {
	private static final long serialVersionUID = 1L;

	public static final int MAXIMUM_RATE = 5;
	private List<AbstractButton> buttons;
	private int currentRate;
	private ImageIcon icoRating;
	private ImageIcon icoRatingAdd;
	private ImageIcon icoRatingRemove;
	private ImageIcon icoRatingBlank;
	private List<Game> currentGames;
	JLabel lblRate;
	private List<RateListener> rateListeners = new ArrayList<>();
	private boolean focusable = true;

	public RatingBarPanel(String label, boolean focusable) {
		super();
		this.focusable = focusable;
		if (label == null || label.trim().isEmpty()) {
			lblRate = new JLabel("");
		} else {
			lblRate = new JLabel(label);
		}
		initComponents();
		createUI();
	}

	private void initComponents() {
		buttons = new ArrayList<>();
		for (int i = 0; i < 5; i++) {
			AbstractButton btn = new JButton("");
			btn.setFocusable(focusable);
			buttons.add(btn);
		}
		int size = ScreenSizeUtil.is3k() ? 32 : 16;
		ColorStore.current().setColor("rating", new Color(255, 195, 0));
		ColorStore.current().setColor("ratingBlank", ColorStore.current().getColor(ColorConstants.SVG_NO_COLOR));
		ColorStore.current().setColor("ratingAdd", new Color(40, 167, 69));
		ColorStore.current().setColor("ratingRemove", new Color(237, 67, 55));
		for (AbstractButton btn : buttons) {
			icoRating = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), size, ColorStore.current().getColor("rating"));
			icoRatingBlank = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), size, ColorStore.current().getColor("ratingBlank"));
			icoRatingAdd = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), size, ColorStore.current().getColor("ratingAdd"));
			icoRatingRemove = ImageUtil.getFlatSVGIconFrom(Icons.get("rating"), size, ColorStore.current().getColor("ratingRemove"));
			btn.setIcon(icoRating);
			btn.setContentAreaFilled(false);
			btn.setBorderPainted(false);
			btn.setFocusPainted(false);
			btn.addActionListener(this);
			btn.addMouseListener(this);
			btn.addFocusListener(this);
		}
	}

	private void createUI() {
		setLayout(new BorderLayout());
		//add(lblRate, BorderLayout.NORTH);

		WrapLayout layout = new WrapLayout();
		JPanel pnl = new JPanel();
		pnl.setLayout(layout);
		pnl.setOpaque(false);
		layout.setAlignment(FlowLayout.LEADING);
		for (int i = 0; i < buttons.size(); i++) {
			pnl.add(buttons.get(i));
		}
		add(pnl);
	}

	private void showCurrentRate() {
		if (getCurrentGames() != null) {
			if (getCurrentGames().size() == 1) {
				Game firstGame = getCurrentGames().get(0);
				if (firstGame == null) {
					System.out.println("oops");
				} else {
					int rate = firstGame.getRate();
					for (int i = 0; i < buttons.size(); i++) {
						buttons.get(i).setIcon((i + 1 <= rate) ? icoRating : icoRatingBlank);
					}
				}
			}
		}
	}

	private List<Game> getCurrentGames() {
		return currentGames;
	}

	@Override
	public void mouseClicked(MouseEvent e) {
	}

	@Override
	public void mouseEntered(MouseEvent e) {
		for (int i = 0; i < buttons.size(); i++) {
			buttons.get(i).setIcon(icoRating);
			if (buttons.get(i) == e.getSource()) {
				if (getCurrentGames().size() != 1) {
					return;
				}
				currentRate = i;
				int k = 0;
				while (k <= i) {
					buttons.get(k++).setIcon(getCurrentGames().get(0).getRate() == 0 || k <= getCurrentGames().get(0).getRate() ? icoRating
							: icoRatingAdd);
				}
				while (k < getCurrentGames().get(0).getRate()) {
					buttons.get(k++).setIcon(icoRatingRemove);
				}
				return;
			}
		}
	}

	@Override
	public void mouseExited(MouseEvent e) {
		if (getCurrentGames() != null) {
			showCurrentRate();
		}
	}

	@Override
	public void mousePressed(MouseEvent e) {
	}

	@Override
	public void mouseReleased(MouseEvent e) {
	}

	@Override
	public void focusGained(FocusEvent e) {
		for (int i = 0; i < buttons.size(); i++) {
			buttons.get(i).setIcon(icoRating);
			if (buttons.get(i) == e.getSource()) {
				if (getCurrentGames().size() != 11) {
					return;
				}
				currentRate = i;
				int k = 0;
				while (k <= i) {
					buttons.get(k++).setIcon(getCurrentGames().get(0).getRate() == 0 || k <= getCurrentGames().get(0).getRate() ? icoRating
							: icoRatingAdd);
				}
				while (k < getCurrentGames().get(0).getRate()) {
					buttons.get(k++).setIcon(icoRatingRemove);
				}
				return;
			}
		}
	}

	@Override
	public void focusLost(FocusEvent e) {
		if (getCurrentGames() != null) {
			showCurrentRate();
		}
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		setRate();
	}

	private void setRate() {
		if (getCurrentGames() != null) {
			for (Game g : getCurrentGames()) {
				int rate = (g.getRate() == currentRate + 1) ? 0 : currentRate + 1;
				g.setRate(rate);
				showCurrentRate();
				RateEvent ev = new RateEvent(g);
				fireRateChangedEvent(ev);
			}
		}
	}

	private void fireRateChangedEvent(RateEvent e) {
		for (RateListener l : rateListeners) {
			l.rateChanged(e);
		}
	}

	public void addRateListener(RateListener l) {
		rateListeners.add(l);
	}

	@Override
	public void gameSelected(GameSelectionEvent e) {
		currentGames = e.getGames();
		showCurrentRate();
	}

	public void languageChanged() {
		if (!lblRate.getText().isEmpty()) {
			lblRate.setText(Messages.get(MessageConstants.RATE_GAME));
		}
	}
}