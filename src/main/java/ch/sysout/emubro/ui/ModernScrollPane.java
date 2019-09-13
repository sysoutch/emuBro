package ch.sysout.emubro.ui;

import java.awt.Color;
import java.awt.Component;
import java.awt.Container;
import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Insets;
import java.awt.Rectangle;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JScrollBar;
import javax.swing.JScrollPane;
import javax.swing.ScrollPaneLayout;
import javax.swing.plaf.basic.BasicScrollBarUI;

public class ModernScrollPane extends JScrollPane {
	private static final long serialVersionUID = 1L;

	private static final int SCROLL_BAR_ALPHA_ROLLOVER = 100;
	private static final int SCROLL_BAR_ALPHA = 50;
	private static final int THUMB_SIZE = 8;
	private static final int SB_SIZE = 10;
	private static final Color THUMB_COLOR = Color.BLACK;

	public ModernScrollPane(Component view, int verticalScrollBarPolicy, int horizontalScrollBarPolicy) {
		this(view);
		this.verticalScrollBarPolicy = verticalScrollBarPolicy;
		this.horizontalScrollBarPolicy = horizontalScrollBarPolicy;
	}

	public ModernScrollPane(Component view) {
		setBorder(null);

		JScrollBar verticalScrollBar = getVerticalScrollBar();
		verticalScrollBar.setOpaque(false);
		verticalScrollBar.setUI(new ModernScrollBarUI(this));

		JScrollBar horizontalScrollBar = getHorizontalScrollBar();
		horizontalScrollBar.setOpaque(false);
		horizontalScrollBar.setUI(new ModernScrollBarUI(this));

		setLayout(new ScrollPaneLayout() {
			private static final long serialVersionUID = 1L;

			@Override
			public void layoutContainer(Container parent) {
				Rectangle rect = ((JScrollPane) parent).getBounds();
				rect.x = 0;

				Insets insets = parent.getInsets();
				rect.x = insets.left;
				rect.y = insets.top;
				rect.width -= insets.left + insets.right;
				rect.height -= insets.top + insets.bottom;
				if (viewport != null) {
					viewport.setBounds(rect);
				}
				//
				boolean verticalScrollBarRequired = isVerticalScrollBarRequired();
				boolean horizontalScrollBarRequired = isHorizontalScrollBarRequired();

				// vertical scroll bar
				Rectangle rectVerticalScrollBar = new Rectangle();
				rectVerticalScrollBar.width = SB_SIZE;
				rectVerticalScrollBar.height = rect.height - (horizontalScrollBarRequired ? rectVerticalScrollBar.width : 0);
				rectVerticalScrollBar.x = rect.x + rect.width - rectVerticalScrollBar.width;
				rectVerticalScrollBar.y = rect.y;
				if (vsb != null) {
					vsb.setBounds(rectVerticalScrollBar);
				}

				// horizontal scroll bar
				Rectangle rectHorizontalScrollBar = new Rectangle();
				rectHorizontalScrollBar.height = SB_SIZE;
				rectHorizontalScrollBar.width = rect.width - (verticalScrollBarRequired ? rectHorizontalScrollBar.height : 0);
				rectHorizontalScrollBar.x = rect.x;
				rectHorizontalScrollBar.y = rect.y + rect.height - rectHorizontalScrollBar.height;
				if (hsb != null) {
					hsb.setBounds(rectHorizontalScrollBar);
				}
			}
		});

		// Layering
		setComponentZOrder(getVerticalScrollBar(), 1);
		setComponentZOrder(getHorizontalScrollBar(), 0);
		setComponentZOrder(getViewport(), 2);

		viewport.setView(view);
	}

	private boolean isVerticalScrollBarRequired() {
		Rectangle viewRect = viewport.getViewRect();
		Dimension viewSize = viewport.getViewSize();
		return viewSize.getHeight() > viewRect.getHeight();
	}

	private boolean isHorizontalScrollBarRequired() {
		Rectangle viewRect = viewport.getViewRect();
		Dimension viewSize = viewport.getViewSize();
		return viewSize.getWidth() > viewRect.getWidth();
	}

	private static class ModernScrollBarUI extends BasicScrollBarUI {
		private JScrollPane sp;

		public ModernScrollBarUI(ModernScrollPane sp) {
			this.sp = sp;
		}

		@Override
		protected JButton createDecreaseButton(int orientation) {
			return new InvisibleScrollBarButton();
		}

		@Override
		protected JButton createIncreaseButton(int orientation) {
			return new InvisibleScrollBarButton();
		}

		@Override
		protected void paintTrack(Graphics g, JComponent c, Rectangle trackBounds) {
		}

		@Override
		protected void paintThumb(Graphics g, JComponent c, Rectangle thumbBounds) {
			int alpha = isThumbRollover() ? SCROLL_BAR_ALPHA_ROLLOVER : SCROLL_BAR_ALPHA;
			int orientation = scrollbar.getOrientation();
			int x = thumbBounds.x;
			int y = thumbBounds.y;

			int width = orientation == JScrollBar.VERTICAL ? THUMB_SIZE : thumbBounds.width;
			width = Math.max(width, THUMB_SIZE);

			int height = orientation == JScrollBar.VERTICAL ? thumbBounds.height : THUMB_SIZE;
			height = Math.max(height, THUMB_SIZE);

			Graphics2D graphics2D = (Graphics2D) g.create();
			graphics2D.setColor(new Color(THUMB_COLOR.getRed(), THUMB_COLOR.getGreen(), THUMB_COLOR.getBlue(), alpha));
			graphics2D.fillRect(x, y, width, height);
			graphics2D.dispose();
		}

		@Override
		protected void setThumbBounds(int x, int y, int width, int height) {
			super.setThumbBounds(x, y, width, height);
			sp.repaint();
		}

		/**
		 * Invisible Buttons, to hide scroll bar buttons
		 */
		private static class InvisibleScrollBarButton extends JButton {
			private static final long serialVersionUID = 1;

			private InvisibleScrollBarButton() {
				setOpaque(false);
				setFocusable(false);
				setFocusPainted(false);
				setBorderPainted(false);
				setBorder(BorderFactory.createEmptyBorder());
			}
		}
	}
}