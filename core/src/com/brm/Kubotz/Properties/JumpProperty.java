package com.brm.Kubotz.Properties;


import com.brm.GoatEngine.ECS.Properties.Property;

/**
 * Allows an entity to be able to jump
 */
public class JumpProperty extends Property {
    public static final String ID = "JUMP_PROPERTY";

    private int nbJumpsMax = 1; //The Max number of consecutive jumps
    public int nbJujmps;   //The number of consecutive jumps executed so far

    /**
     * Defaults the number of jumps to 1
     */
    public JumpProperty(){
        this.setNbJumpsMax(1);
    }

    /**
     * Allows to put a defined number of jumps
     * @param nbMaxJumps
     */
    public JumpProperty(int nbMaxJumps){
        this.setNbJumpsMax(nbMaxJumps);
    }


    public int getNbJumpsMax() {
        return nbJumpsMax;
    }

    public void setNbJumpsMax(int nbJumpsMax) {
        this.nbJumpsMax = nbJumpsMax;
    }
}
