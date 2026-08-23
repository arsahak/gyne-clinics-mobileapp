// The chat list is shared between roles: patients reach it by pushing
// `/consultations` from Help/doctor-profile, doctors get it as a tab root
// here. Re-exporting avoids maintaining two copies of the same screen.
export { default } from "../consultations";
