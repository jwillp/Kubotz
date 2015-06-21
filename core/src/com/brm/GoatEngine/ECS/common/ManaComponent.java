package com.brm.GoatEngine.ECS.common;

import com.badlogic.gdx.utils.XmlReader;

/**
 * Used for magic powers, mana, energy etc.
 */
public class ManaComponent extends HealthComponent{
    public final static String ID = "MANA_COMPONENT";

    public ManaComponent(int i) {
        super(i);
    }


    public ManaComponent(XmlReader.Element dataComponent){
        super(dataComponent);
    }



}
