package com.brm.GoatEngine.ECS.Components;




public abstract class Component {

    private boolean isEnabled = true; //By default a component is enabled

    /**
     * Returns if the component is enabled
     * @return
     */
    public boolean isEnabled() {
        return isEnabled;
    }

    public void setEnabled(boolean isActivated) {
        this.isEnabled = isActivated;
    }

    /**
     * Returns if the component is disabled
     * @return
     */
    public boolean isDisabled(){
        return !isEnabled;
    }



    public static class EntityPropertyNotFoundException extends RuntimeException{

        //Constructor that accepts a message
        public EntityPropertyNotFoundException(String propertyName){
            super("The Component \"" + propertyName + "\" was not found in Entity");
        }

    }




}
