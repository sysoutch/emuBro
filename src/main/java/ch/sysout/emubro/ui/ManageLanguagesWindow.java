package ch.sysout.emubro.ui;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.util.EmuBroUtil;
import ch.sysout.emubro.util.Translation;
import ch.sysout.util.Messages;

import javax.swing.*;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;
import javax.swing.event.TableModelEvent;
import javax.swing.event.TableModelListener;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Locale;

public class ManageLanguagesWindow extends JFrame {
    private JPanel panel1;
    private JTable table1;
    private JList<String> list1;
    private JProgressBar progressBar1;
    private JCheckBox hideTranslatedMessagesCheckBox;
    private JCheckBox hideKeyNamesCheckBox;
    private JScrollPane spTable1;
    private JLabel lblTranslatedMessages;
    private JLabel lblAllWords;
    private final DefaultListModel<String> mdlList = new DefaultListModel<>();
    private TranslationsTableModel mdlTbl1;

    public ManageLanguagesWindow() {
        super("Manage Languages");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setContentPane(panel1);
        list1.setModel(mdlList);
        list1.addListSelectionListener(new ListSelectionListener() {
            @Override
            public void valueChanged(ListSelectionEvent e) {
                System.out.println(e.getSource());
            }
        });
        pack();
    }

    private void createUIComponents() {
        String[][] data = {
                { "showPlatformIconsInView", "Show platform icons","", "", "" },
                { "mnuTools", "Tools","", "", "" },
                { "minimizeAfterGameStart", "Minimize {0}","", "", "" },
                { "themeManager", "Theme Manager","", "", "" }
        };
        String[] column = { "Key", "Value", "New Value", "OK?", "Comment" };
    }

    public void initializeLanguages(List<String> languages) {
        for (String s : languages) {
            mdlList.addElement(s);
        }
//        columnModel.addColumn(new TableColumn());
//        columnModel.addColumn(new TableColumn());
//        mdlTbl1.addRow(new Object[] { "key", "value", "value" });
//        mdlTbl1.addRow(new Object[] { "key", "value", "value" });
//        mdlTbl1.addRow(new Object[] { "key", "value", "value" });
//        mdlTbl1.addRow(new Object[] { "key", "value", "value" });
//        mdlTbl1.addRow(new Object[] { "key", "value", "value" });
//        mdlTbl1.addRow(new Object[] { "key", "value", "value" });
    }

    public void initializeTranslations(Explorer explorer) {
        if (table1 == null) {
            mdlTbl1 = new TranslationsTableModel(explorer);
            mdlTbl1.addTableModelListener(new TableModelListener() {
                @Override
                public void tableChanged(TableModelEvent e) {
                    if (e.getColumn() == 2) {
                        System.out.println("value changed");
                    }
                }
            });
            table1 = new JTable(mdlTbl1);
            spTable1.setViewportView(table1);
        }
        mdlTbl1.removeAllElements();
        InputStream is = ManageLanguagesWindow.class.getResourceAsStream("/messages_"+ Locale.getDefault()+".properties");
        if (is != null) {
            try {
                BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(is));
                String line = "";
                int messageCount = 0;
                int notTranslatedYet = 0;
                while ((line = bufferedReader.readLine()) != null) {
                    if (line.startsWith("#")) {
                        continue;
                    }
                    messageCount++;
                    if (line.contains("=[?]")) {
                        notTranslatedYet++;
                    }
                    String keyName = line.split("=")[0];
                    String value = line.split("=")[1];
                    System.out.printf("%s\n", line);
                    mdlTbl1.addRow(new Translation(keyName, value, "", "", false));
                }
                bufferedReader.close();
                System.out.println("-");
                int translatedWordCount = messageCount - notTranslatedYet;
                float translateProgressInPercent = (float) (translatedWordCount) / messageCount * 100f;
                translateProgressInPercent = EmuBroUtil.round(translateProgressInPercent, 2);
                progressBar1.setMaximum(messageCount);
                progressBar1.setValue(translatedWordCount);
                progressBar1.setString(""+translateProgressInPercent);
                System.out.println("Total Messages: " + messageCount + " not translated yet: " + notTranslatedYet + " ("+translateProgressInPercent+"% translated)");
                lblTranslatedMessages.setText(""+ translatedWordCount);
                lblAllWords.setText(""+messageCount);
            } catch(IOException e1){
                e1.printStackTrace();
            }
        }
    }
}
