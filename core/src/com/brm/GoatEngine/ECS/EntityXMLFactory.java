package com.brm.GoatEngine.ECS;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.physics.box2d.World;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.XmlReader;
import com.badlogic.gdx.utils.XmlReader.Element;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.ECS.core.EntityManager;

import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

public class EntityXMLFactory {


    public static EditorEntityProperty editorProperty; //Current editorProperty


    /**
     * Creates an Entity according to an XML file that is registered with the entityManager
     * @param blueprintFile
     * @param entityManager
     * @param world the box2D world in case with create a PhysicsComponent
     * @return
     */
    public static Entity createEntity(String blueprintFile, EntityManager entityManager, World world){



        Entity entity = null;
        try {
            XmlReader reader = new XmlReader();
            Element root = reader.parse(Gdx.files.internal(blueprintFile));
            entity = entityManager.createEntity();
            //For every component declared
            Array<Element> components = root.getChildrenByName("component");
            for(Element compEl : components){
                Class<?> clazz = Class.forName(compEl.getAttribute("name"));    //Create a new instance of that object
                Object component;
                //If we have a PhysicsComponent well pass the World
                if(clazz.getCanonicalName().equals(PhysicsComponent.class.getCanonicalName())){
                    Constructor<?> ctor = clazz.getConstructor(Element.class, World.class, Entity.class);
                    component = ctor.newInstance(compEl, world, entity);
                }else{
                    Constructor<?> ctor = clazz.getConstructor(Element.class);
                    component = ctor.newInstance(compEl);
                }
                String componentId = (String)clazz.getDeclaredField("ID").get(component);

                //Add the component
                entity.addComponent((EntityComponent)component, componentId);
            }

            //Creation done we can destroy editorProperty
            editorProperty = null;

            return  entity;

        } catch (IOException e) {   //TODO stop program or display stack trace in Console
            e.printStackTrace();
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (NoSuchFieldException e) {
            e.printStackTrace();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        }
        return entity;
    }


    /**
     * Tries to find the value of a editorProperty
     * @param blueprintFile
     * @param propertyName
     * @return
     */
    public static String findProperty(String blueprintFile, String propertyName){
        return null;
    }






}
