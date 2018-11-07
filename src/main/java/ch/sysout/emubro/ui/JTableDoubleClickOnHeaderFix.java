package ch.sysout.emubro.ui;

import java.awt.AWTException;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Point;
import java.awt.Rectangle;
import java.awt.Robot;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

import javax.swing.DefaultRowSorter;
import javax.swing.JTable;
import javax.swing.JViewport;
import javax.swing.RowSorter;
import javax.swing.event.MouseInputAdapter;
import javax.swing.table.JTableHeader;
import javax.swing.table.TableCellRenderer;

public class JTableDoubleClickOnHeaderFix extends JTable {
	private static final long serialVersionUID = 1L;

	private TableColumnAdjuster adjuster;

	private int rollOverRowIndex = -1;

	public JTableDoubleClickOnHeaderFix() {
		super();
		adjuster = new TableColumnAdjuster(this);
		RollOverListener lst = new RollOverListener();
		addMouseMotionListener(lst);
		addMouseListener(lst);
		addListeners();
	}

	private void addListeners() {
		JTableHeader header = getTableHeader();
		header.addMouseListener(new MouseAdapter() {
			private Robot robot;

			@Override
			public void mousePressed(MouseEvent e) {
				boolean b = (getTableHeader()
						.getCursor() == (Cursor.getPredefinedCursor(Cursor.E_RESIZE_CURSOR | Cursor.W_RESIZE_CURSOR)));


				RowSorter<? extends javax.swing.table.TableModel> sorter = (JTableDoubleClickOnHeaderFix.this
						.getRowSorter());
				if (sorter != null) {
					for (int i = 0; i < JTableDoubleClickOnHeaderFix.this.getColumnCount(); i++) {
						((DefaultRowSorter) sorter).setSortable(i, !b);
					}
				}
			}

			@Override
			public void mouseClicked(MouseEvent e) {
				int newX = (int) (e.getPoint().getX() - 4);
				int x = (newX < 0) ? 0 : newX;
				int y = (int) e.getPoint().getY();
				Point point = new Point(x, y);
				int index = JTableDoubleClickOnHeaderFix.this.columnAtPoint(point);
				if (getTableHeader()
						.getCursor() == (Cursor.getPredefinedCursor(Cursor.E_RESIZE_CURSOR | Cursor.W_RESIZE_CURSOR))) {
					if (e.getClickCount() == 2) {
						// String colName = getColumnName(index);
						// TableColumn col = getColumn(colName);
						// final int oldWidth = col.getWidth();
						adjuster.adjustColumn(index);

						// final int newWidth = col.getWidth();
						// final int difference = newWidth - oldWidth;
						// try {
						// if (robot == null) {
						// robot = new Robot();
						// }
						// robot.mouseMove(e.getLocationOnScreen().x +
						// difference, e.getLocationOnScreen().y);
						// System.out.println(e.getX() + " - " +
						// getParent().getWidth());
						// JTableDoubleClickOnHeaderFix.scrollToVisible(JTableDoubleClickOnHeaderFix.this,
						// y, 4, newWidth);
						// } catch (AWTException e1) {
						// e1.printStackTrace();
						// }
						try {
							if (robot == null) {
								robot = new Robot();
							}
							final int valX = e.getLocationOnScreen().x;
							final int valY = e.getLocationOnScreen().y;
							robot.mouseMove(valX - 1, valY);
							robot.mouseMove(valX, valY);
						} catch (AWTException e1) {
							// TODO Auto-generated catch block
							e1.printStackTrace();
						}
					}
				}
			}
		});
	}

	protected static void scrollToVisible(JTable table, int rowIndex, int vColIndex, int newWidth) {
		if (!(table.getParent() instanceof JViewport)) {
			return;
		}
		JViewport viewport = (JViewport) table.getParent();

		// This rectangle is relative to the table where the
		// northwest corner of cell (0,0) is always (0,0).
		Rectangle rect = table.getCellRect(rowIndex, vColIndex, true);
		// rect.setSize((int) (rect.getX() + 0), (int) rect.getY());

		// The location of the viewport relative to the table
		Point pt = viewport.getViewPosition();

		// Translate the cell location so that it is relative
		// to the view, assuming the northwest corner of the
		// view is (0,0)
		rect.setLocation(rect.x - pt.x + newWidth, rect.y - pt.y);

		table.scrollRectToVisible(rect);

		// Scroll the area into view
		// viewport.scrollRectToVisible(rect);
	}

	public static void scrollToVisible(JTable table, int rowIndex, int vColIndex) {
		scrollToVisible(table, rowIndex, vColIndex, 0);
	}

	@Override
	public boolean isCellEditable(int row, int column) {
		return false;
	}

	@Override
	public Component prepareRenderer(TableCellRenderer renderer, int row, int column) {
		Component c = super.prepareRenderer(renderer, row, column);
		if (isRowSelected(row)) {
			c.setForeground(getSelectionForeground());
			c.setBackground(getSelectionBackground());
		} else if (row == rollOverRowIndex) {
			c.setForeground(getSelectionBackground());
			c.setBackground(getBackground());
		} else {
			c.setForeground(getForeground());
			c.setBackground(getBackground());
		}
		return c;
	}


	private class RollOverListener extends MouseInputAdapter {

		@Override
		public void mouseExited(MouseEvent e) {
			rollOverRowIndex = -1;
			repaint();
		}

		@Override
		public void mouseMoved(MouseEvent e) {
			int row = rowAtPoint(e.getPoint());
			if( row != rollOverRowIndex ) {
				rollOverRowIndex = row;
				repaint();
			}
		}
	}
}
