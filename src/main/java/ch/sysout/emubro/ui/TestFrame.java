package ch.sysout.emubro.ui;

import javax.swing.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class TestFrame extends JFrame {
    private JPanel pnlMain;
    private JButton button1;
    private JButton vButton;
    private JButton YTButton;
    private JButton googleButton;
    private JButton button2;
    private JButton button3;
    private JButton button4;
    private JButton button5;
    private JButton button6;
    private JButton button7;
    private JTextArea textArea1;
    private JButton btnTest;

    public TestFrame() {
        setTitle("My Test Frame");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        add(pnlMain);
        pack();
        setSize(300, 400);
        setLocationRelativeTo(null);
        setVisible(true);
    }
}
