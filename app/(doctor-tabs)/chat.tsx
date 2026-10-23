// The chat list is shared between roles: patients reach it by pushing
// `/messages` from Get help, doctors get it as a tab root
// here. Re-exporting avoids maintaining two copies of the same screen.
export { default } from "../messages";
