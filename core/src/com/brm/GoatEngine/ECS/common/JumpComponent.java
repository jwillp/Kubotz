package com.brm.GoatEngine.ECS.common;


import com.badlogic.gdx.utils.XmlReader;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Allows an entity to be able to jump
 */
public class JumpComponent extends EntityComponent {
    public static final String ID = "JUMP_PROPERTY";

    private int nbJumpsMax = 1; //The Max number of consecutive jumps
    private int nbJujmps;   //The number of consecutive jumps executed so far


    private Timer cooldown = new Timer(500); //Cooldown between jumps

    /**
     * Defaults the number of jumps to 1
     */
    public JumpComponent(){
        this.setNbJumpsMax(1);
        cooldown.start();

    }

    /**
     * Desiralizes a component
     *
     * @param componentData the data as an XML element
     */
    @Override
    public void deserialize(XmlReader.Element componentData) {

    }

    /**
     * Allows to put a defined number of jumps
     * @param nbMaxJumps
     */
    public JumpComponent(int nbMaxJumps){
        this.setNbJumpsMax(nbMaxJumps);
        cooldown.start();
    }


    public int getNbJumpsMax() {
        return nbJumpsMax;
    }

    public void setNbJumpsMax(int nbJumpsMax) {
        this.nbJumpsMax = nbJumpsMax;
    }

    public int getNbJujmps() {
        return nbJujmps;
    }

    public void setNbJujmps(int nbJujmps) {
        this.nbJujmps = nbJujmps;
    }

    public Timer getCooldown() {
        return cooldown;
    }

    public void setCooldown(Timer cooldown) {
        this.cooldown = cooldown;
    }
}
