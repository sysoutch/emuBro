; emuBro NSIS installer hooks
; Cleans up legacy executable names and duplicate shortcuts from older installers.

!macro NSIS_HOOK_PREINSTALL
  ; Legacy executable names from older builds.
  Delete "$INSTDIR\emubro_desktop.exe"
  Delete "$LOCALAPPDATA\Programs\emuBro\emubro_desktop.exe"
  Delete "$LOCALAPPDATA\Programs\emubro_desktop\emubro_desktop.exe"
  Delete "$PROGRAMFILES\emuBro\emubro_desktop.exe"
  Delete "$PROGRAMFILES64\emuBro\emubro_desktop.exe"
  Delete "$PROGRAMFILES\emubro_desktop\emubro_desktop.exe"
  Delete "$PROGRAMFILES64\emubro_desktop\emubro_desktop.exe"

  ; Duplicate shortcuts in desktop/start menu (current user + all users paths).
  Delete "$USERPROFILE\Desktop\emuBro.lnk"
  Delete "$USERPROFILE\Desktop\emubro_desktop.lnk"
  Delete "$PUBLIC\Desktop\emuBro.lnk"
  Delete "$PUBLIC\Desktop\emubro_desktop.lnk"

  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emuBro.lnk"
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emubro_desktop.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emuBro.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emubro_desktop.lnk"

  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emuBro.lnk"
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emubro_desktop.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emuBro.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emubro_desktop.lnk"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Legacy executable names that may remain from old installs.
  Delete "$INSTDIR\emubro_desktop.exe"

  ; Legacy shortcuts that may survive older uninstall metadata.
  Delete "$USERPROFILE\Desktop\emubro_desktop.lnk"
  Delete "$PUBLIC\Desktop\emubro_desktop.lnk"
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emubro_desktop.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emubro_desktop.lnk"
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emubro_desktop.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emubro_desktop.lnk"
!macroend
