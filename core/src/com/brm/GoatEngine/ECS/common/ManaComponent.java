package com.brm.GoatEngine.ECS.common;

/**
 * Used for magic powers, mana, energy etc.
 */
public class ManaComponent extends HealthComponent{
    public final static String ID = "MANA_COMPONENT";

    public ManaComponent(int i) {
        super(i);
    }
}