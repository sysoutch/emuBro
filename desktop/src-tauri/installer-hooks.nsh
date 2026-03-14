; emuBro NSIS installer hooks
; Cleans up legacy executable names and duplicate shortcuts from older installers.

!macro NSIS_HOOK_PREINSTALL
  ; Legacy executable names from older builds.
  Delete "$INSTDIR\emubro_desktop.exe"
  Delete "$LOCALAPPDATA\Programs\emuBro\emubro_desktop.exe"
  Delete "$LOCALAPPDATA\Programs\emuBro\emuBro.exe"
  Delete "$LOCALAPPDATA\Programs\emubro_desktop\emubro_desktop.exe"
  Delete "$LOCALAPPDATA\Programs\emubro_desktop\emuBro.exe"
  Delete "$PROGRAMFILES\emuBro\emubro_desktop.exe"
  Delete "$PROGRAMFILES64\emuBro\emubro_desktop.exe"
  Delete "$PROGRAMFILES\emubro_desktop\emubro_desktop.exe"
  Delete "$PROGRAMFILES64\emubro_desktop\emubro_desktop.exe"
  ; Old install roots from previous packaging layouts.
  RMDir /r "$LOCALAPPDATA\Programs\emuBro"
  RMDir /r "$LOCALAPPDATA\Programs\emubro_desktop"

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
  Delete "$LOCALAPPDATA\Programs\emuBro\emubro_desktop.exe"
  Delete "$LOCALAPPDATA\Programs\emuBro\emuBro.exe"
  Delete "$LOCALAPPDATA\Programs\emubro_desktop\emubro_desktop.exe"
  Delete "$LOCALAPPDATA\Programs\emubro_desktop\emuBro.exe"
  RMDir /r "$LOCALAPPDATA\Programs\emuBro"
  RMDir /r "$LOCALAPPDATA\Programs\emubro_desktop"

  ; Legacy shortcuts that may survive older uninstall metadata.
  Delete "$USERPROFILE\Desktop\emubro_desktop.lnk"
  Delete "$PUBLIC\Desktop\emubro_desktop.lnk"
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emubro_desktop.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emubro_desktop.lnk"
  Delete "$APPDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emubro_desktop.lnk"
  Delete "$PROGRAMDATA\Microsoft\Windows\Start Menu\Programs\emuBro\emubro_desktop.lnk"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DeleteRegKey HKCU "Software\Classes\emubro"
  WriteRegStr HKCU "Software\Classes\emubro" "" "URL:emuBro Protocol"
  WriteRegStr HKCU "Software\Classes\emubro" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\emubro\DefaultIcon" "" "$INSTDIR\emuBro.exe,0"
  WriteRegStr HKCU "Software\Classes\emubro\shell" "" "open"
  WriteRegStr HKCU "Software\Classes\emubro\shell\open\command" "" '"$INSTDIR\emuBro.exe" "%1"'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\emubro"
!macroend
