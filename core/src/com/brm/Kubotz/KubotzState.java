package com.brm.Kubotz;

import com.brm.GoatEngine.ECS.Components.StateComponent;

/**
 * States for Kubotz
 */
public enum KubotzState implements StateComponent.EntityState {

    IDLE,
    RUNNING,

    JUMPING,
    FALLING,
    LANDING,

    DASHING,

    PUNCHING,



}
