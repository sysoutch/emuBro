package ch.sysout.emubro.util;

public class Translation {
    private String keyName;
    private String value;
    private String newValue;
    private String comment;
    private boolean okCheckBox;

    public Translation(String keyName, String value, String newValue, String comment, boolean okCheckBox) {
        this.keyName = keyName;
        this.value = value;
        this.newValue = newValue;
        this.comment = comment;
        this.okCheckBox = okCheckBox;
    }

    public String getKeyName() {
        return keyName;
    }

    public String getValue() {
        return value;
    }

    public String getNewValue() {
        return newValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = newValue;
    }

    public String getComment() {
        return comment;
    }

    public boolean getOkCheckBox() {
        return okCheckBox;
    }

    public void setOkCheckBox(boolean b) {
        okCheckBox = b;
    }
}
