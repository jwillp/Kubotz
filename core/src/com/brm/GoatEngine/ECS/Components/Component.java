package com.brm.GoatEngine.ECS.Components;




public abstract class Component {

    public final static String ID = "GENERIC_PROPERTY";

    private boolean isEnabled;


    public boolean isEnabled() {
        return isEnabled;
    }

    public void setEnabled(boolean isActivated) {
        this.isEnabled = isActivated;
    }



    public static class EntityPropertyNotFoundException extends RuntimeException{

        //Constructor that accepts a message
        public EntityPropertyNotFoundException(String propertyName){
            super("The Property \"" + propertyName + "\" not found in Entity");
        }

    }




}
