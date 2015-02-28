package com.brm.GoatEngine.ECS.Components;




public abstract class Component {


    private boolean isEnabled = true; //By default a component is enabled


    /**
     * Called when the component is attached to an entity
     */
    public void onAttach(){}

    /**
     * Called when the component is detached from an entity
     */
    public void onDetach(){}




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



    /**
     * Exception thrown when the game engine tries to use a component from an entity
     * that does not posses that particular component
     */
    public static class EntityComponentNotFoundException extends RuntimeException{

        //Constructor that accepts a message
        public EntityComponentNotFoundException(String propertyName){
            super("The Component \"" + propertyName + "\" was not found in Entity");
        }

    }




}
