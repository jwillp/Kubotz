package com.brm.GoatEngine.ECS.core;


public abstract class EntityComponent {


    private boolean isEnabled = true; //By default a component is enabled


    public EntityComponent(){}

    public EntityComponent(boolean isEnabled){
        this.setEnabled(isEnabled);
    }

    /**
     * Called when the component is attached to an entity
     */
    public void onAttach(Entity entity){}

    /**
     * Called when the component is detached from an entity
     */
    public void onDetach(Entity entity){}




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








}
