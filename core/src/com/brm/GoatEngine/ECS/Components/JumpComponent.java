package com.brm.GoatEngine.ECS.Components;


import com.brm.GoatEngine.ECS.Components.Component;
import com.brm.GoatEngine.Utils.Timer;

/**
 * Allows an entity to be able to jump
 */
public class JumpComponent extends Component {
    public static final String ID = "JUMP_PROPERTY";

    private int nbJumpsMax = 1; //The Max number of consecutive jumps
    public int nbJujmps;   //The number of consecutive jumps executed so far


    public Timer cooldown = new Timer(500); //Cooldown between jumps

    /**
     * Defaults the number of jumps to 1
     */
    public JumpComponent(){
        this.setNbJumpsMax(1);
        cooldown.start();

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
}
