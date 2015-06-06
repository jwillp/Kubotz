package com.brm.Kubotz.Events;

import com.brm.GoatEngine.ECS.core.Entity.Event;

/**
 * Triggered when an entity fires a Gun Shot
 */
public class GunShotEvent extends Event{

    public final String shooterId; //The entity Shooting

    public GunShotEvent(String shooterId){
        super(shooterId);
        this.shooterId = shooterId;
    }





}
