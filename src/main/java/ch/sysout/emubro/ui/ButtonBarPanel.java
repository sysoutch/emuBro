package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.PopupMenu;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Messages;

public class ButtonBarPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private List<ButtonBarButton> components = new ArrayList<>();

	private int lastPanelWidth = -1;

	private boolean gameSelected = false;

	public ButtonBarPanel() {
		super();
		initComponents();
	}

	@Override
	public Component add(Component comp) {
		addComponent((ButtonBarButton) comp);
		return comp;
	}

	@Override
	public Component add(Component comp, int index) {
		addComponent((ButtonBarButton) comp);
		return super.add(comp, index);
	}

	@Override
	public void add(PopupMenu popup) {
		super.add(popup);
		// addComponent((ButtonBarButton) popup);
	}

	@Override
	public Component add(String name, Component comp) {
		addComponent((ButtonBarButton) comp);
		return super.add(name, comp);
	}

	@Override
	public void add(Component comp, Object constraints, int index) {
		super.add(comp, constraints, index);
		addComponent((ButtonBarButton) comp);
	}

	private void initComponents() {
		// btnOrganize.setBorderPainted(false);
		// btnRunGame.setEnabled(false);
		// btnOrganize.setContentAreaFilled(false);
		// btnRunGame.setToolTipText("Spiel starten");
	}

	public void addComponent(ButtonBarButton c) {
		components.add(c);
	}

	@Override
	public void add(Component comp, Object constraints) {
		super.add(comp, constraints);
		addComponent((ButtonBarButton) comp);
	}

	public void removeComponent(ButtonBarButton c) {
		if (components.contains(c)) {
			components.remove(c);
		}
	}

	@Override
	public void remove(Component comp) {
		super.remove(comp);
		removeComponent((ButtonBarButton) comp);
	}

	public void checkMinimizeMaximizeButtons() {
		int currentPanelWidth = getWidth();
		int buttonBarContentWidth = getButtonBarContentWidth();
		boolean disableButton = currentPanelWidth <= buttonBarContentWidth;
		if (disableButton) {
			if (lastPanelWidth >= currentPanelWidth) {
				checkMinimizeButtons();
			}
		} else {
			boolean moreWidthThanBefore = currentPanelWidth >= lastPanelWidth;
			if (moreWidthThanBefore) {
				checkMaximizeButtons();
			}
		}
		lastPanelWidth = currentPanelWidth;
	}

	void checkMinimizeButtons() {
		int currentWidth = getWidth();
		int buttonBarContentWidth = getButtonBarContentWidth();
		int difference = currentWidth - buttonBarContentWidth;
		//		if (gameSelected) {
		if (hasText(1)) {
			if (difference == 0) {
				setEmptyTextForComponent(1);
				setEmptyTextForComponent(2);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMinimizeButtons();
					}
				});
			}
			return;
		} else if (hasText(7)) {
			if (difference == 0) {
				setEmptyTextForComponent(7);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMinimizeButtons();
					}
				});
			}
			return;
		} else if (hasText(6)) {
			if (difference == 0) {
				setEmptyTextForComponent(6);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMinimizeButtons();
					}
				});
			}
			return;
		} else if (hasText(5)) {
			if (difference == 0) {
				setEmptyTextForComponent(5);
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMinimizeButtons();
					}
				});
			}
			return;
		} else if (hasText(3)) {
			if (difference == 0) {
				setEmptyTextForComponent(3);
			}
			return;
		} else {
			//				System.out.println("difffff: " + difference);
			//				if (components.get(6).isEnabled()) {
			//					components.get(6).setEnabled(false);
			//				} else if (components.get(5).isEnabled()) {
			//					components.get(5).setEnabled(false);
			//				} else if (components.get(4).isEnabled()) {
			//					components.get(4).setEnabled(false);
			//				} else if (components.get(2).isEnabled()) {
			//					components.get(2).setEnabled(false);
			//					components.get(3).setEnabled(false);
			//				} else if (components.get(1).isEnabled()) {
			//					components.get(1).setEnabled(false);
			//				} else if (components.get(0).isEnabled()) {
			//					components.get(0).setEnabled(false);
			//				}
		}
		//		} else {
		//			if (hasText(0)) {
		//				setEmptyTextForComponent(0);
		//				setEmptyTextForComponent(1);
		//			} else {
		//				//				components.get(1).setEnabled(false);
		//				//				components.get(0).setEnabled(false);
		//			}
		//		}
	}

	private void setEmptyTextForComponent(int i) {
		components.get(i).setText("");
	}

	private boolean hasText(int index) {
		return !components.get(index).getText().isEmpty();
	}

	void checkMaximizeButtons() {
		int currentWidth = getWidth();
		int buttonBarContentWidth = getButtonBarContentWidth();
		int difference = currentWidth - buttonBarContentWidth;
		//		if (gameSelected) {
		if (!hasText(3)) {
			if (difference > (components.get(3).getWidth() + components.get(4).getWidth())) {
				//					if (!components.get(3).isEnabled() || !components.get(4).isEnabled()
				//							|| !components.get(5).isEnabled() || !components.get(6).isEnabled()) {
				//						return;
				//					}
				components.get(3).setText(Messages.get(MessageConstants.RUN_GAME));
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMaximizeButtons();
					}
				});
			}
			return;
		} else if (!hasText(5)) {
			if (difference > (components.get(3).getWidth() + components.get(4).getWidth())) {
				components.get(5).setText(Messages.get(MessageConstants.REMOVE));
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMaximizeButtons();
					}
				});
			}
			return;
		} else if (!hasText(6)) {
			if (difference > components.get(5).getWidth()) {
				//				if (!components.get(7).isEnabled()) {
				//					return;
				//				}
				components.get(6).setText(Messages.get(MessageConstants.RENAME));
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMaximizeButtons();
					}
				});
			}
			return;
		} else if (!hasText(7)) {
			if (difference > components.get(6).getWidth()) {
				components.get(7).setText(Messages.get(MessageConstants.GAME_PROPERTIES));
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMaximizeButtons();
					}
				});
			}
			return;
		} else if (!hasText(1)) {
			if (difference > (components.get(7).getWidth() + components.get(7).getWidth())) {
				components.get(2).setText(Messages.get(MessageConstants.SETTINGS));
				components.get(1).setText(Messages.get(MessageConstants.ORGANIZE));
				SwingUtilities.invokeLater(new Runnable() {

					@Override
					public void run() {
						checkMaximizeButtons();
					}
				});
			}
			return;
		}
		//			if (!components.get(0).isEnabled()) {
		//				components.get(0).setEnabled(true);
		//				components.get(0).setText("");
		//			}
		//			else if (!components.get(1).isEnabled()) {
		//				components.get(1).setEnabled(true);
		//				components.get(1).setText("");
		//			}
		//			else if (!components.get(2).isEnabled()) {
		//				components.get(2).setEnabled(true);
		//				components.get(3).setEnabled(true);
		//				components.get(2).setText("");
		//				components.get(3).setText("");
		//			}
		//			else if (!components.get(4).isEnabled()) {
		//				components.get(4).setEnabled(true);
		//				components.get(4).setText("");
		//			}
		//			else if (!components.get(5).isEnabled()) {
		//				components.get(5).setEnabled(true);
		//				components.get(5).setText("");
		//			}
		//			else if (!components.get(6).isEnabled()) {
		//				components.get(6).setEnabled(true);
		//				components.get(6).setText("");
		//			}
		//		} else {
		//			if (components.get(0).getText().isEmpty()) {
		//				if (difference > (components.get(6).getWidth() + components.get(6).getWidth())) {
		//					components.get(1).setText(Messages.get(MessageConstants.SETTINGS));
		//					if (components.get(0).getText().isEmpty()) {
		//						components.get(0).setText(Messages.get(MessageConstants.ORGANIZE));
		//					}
		//				}
		//			} else {
		//				if (!components.get(0).isEnabled()) {
		//					components.get(0).setEnabled(true);
		//					components.get(0).setText("");
		//				} else if (!components.get(1).isEnabled()) {
		//					components.get(1).setEnabled(true);
		//					components.get(1).setText("");
		//				}
		//			}
		//		}
	}

	private int getButtonBarContentWidth() {
		int width = 0;
		for (AbstractButton c : components) {
			width += c.getWidth();
		}
		//		Insets insets = getBorder().getBorderInsets(this);
		return width;// + (insets.left + insets.right);
	}

	public void gameSelected(GameSelectionEvent e) {
		gameSelected = !e.getGames().isEmpty();
	}

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		BufferedImage background = IconStore.current().getButtonBarBackgroundImage();
		if (background != null) {
			Graphics2D g2d = (Graphics2D) g.create();
			int x = 0;
			int y = 0;
			int w = getWidth();
			int h = getHeight();
			g2d.drawImage(background, 0, 0, w, h, this);
			g2d.dispose();
		}
	}
}
