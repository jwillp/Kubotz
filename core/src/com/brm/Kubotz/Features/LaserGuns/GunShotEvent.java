package com.brm.Kubotz.Features.LaserGuns;

import com.brm.GoatEngine.EventManager.EntityEvent;

/**
 * Triggered when an entity fires a Gun Shot
 */
public class GunShotEvent extends EntityEvent {

    public final String shooterId; //The entity Shooting

    public GunShotEvent(String shooterId){
        super(shooterId);
        this.shooterId = shooterId;
    }





}
