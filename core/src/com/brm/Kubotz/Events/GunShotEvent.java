package com.brm.Kubotz.Events;

/**
 * Triggered when an entity fires a Gun Shot
 */
public class GunShotEvent {

    public final String shooterId; //The entity Shooting

    public GunShotEvent(String shooterId){
        this.shooterId = shooterId;
    }

}
